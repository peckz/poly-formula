import { drawTracking } from './draw'
import { HeadTracker } from './face'
import {
  Landmarkers,
  errorMessage,
  type Delegate,
  type Detection,
  type WorkerRequest,
  type WorkerResponse,
} from './inference'
import { readHands } from './pose'
import { trackingStore } from './store'
import { WheelTracker } from './wheel'

/** Where inference runs. The pipeline only ever sees plain detections. */
type InferenceBackend = {
  readonly delegate: Delegate
  readonly thread: 'worker' | 'main'
  detect(video: HTMLVideoElement, timestamp: number): Promise<Detection>
  close(): void
}

type Pending = {
  resolve: (detection: Detection) => void
  reject: (error: Error) => void
}

/**
 * MediaPipe in a dedicated worker. The main thread only wraps the current
 * camera frame in a VideoFrame and transfers it; the models, their WebGL
 * contexts and the blocking GPU readback all live over there.
 *
 * VideoFrame rather than createImageBitmap: in Chrome 148 headless every
 * ImageBitmap taken from a camera video retained ~1.2 MB after close(),
 * while VideoFrame wrap + close stayed flat.
 */
class WorkerBackend implements InferenceBackend {
  readonly thread = 'worker' as const
  readonly delegate: Delegate
  private readonly worker: Worker
  private pending: Pending | null = null

  private constructor(worker: Worker, delegate: Delegate) {
    this.worker = worker
    this.delegate = delegate
    worker.onmessage = this.onMessage
    worker.onerror = this.onError
  }

  static create(signal: AbortSignal): Promise<WorkerBackend> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('./tracking.worker.ts', import.meta.url),
        { type: 'module' },
      )
      const fail = (message: string) => {
        signal.removeEventListener('abort', onAbort)
        worker.terminate()
        reject(new Error(message))
      }
      const onAbort = () => fail('Tracking stopped')
      signal.addEventListener('abort', onAbort, { once: true })

      worker.onerror = (event) => {
        fail(event.message || 'Tracking worker failed to load')
      }
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data
        if (message.type === 'ready') {
          signal.removeEventListener('abort', onAbort)
          resolve(new WorkerBackend(worker, message.delegate))
        } else if (message.type === 'error') {
          fail(message.message)
        }
      }
      worker.postMessage({ type: 'init' } satisfies WorkerRequest)
    })
  }

  async detect(video: HTMLVideoElement, timestamp: number): Promise<Detection> {
    if (this.pending) {
      throw new Error('Detection already in flight')
    }
    const frame = new VideoFrame(video)
    return new Promise<Detection>((resolve, reject) => {
      this.pending = { resolve, reject }
      try {
        this.worker.postMessage(
          { type: 'frame', frame, timestamp } satisfies WorkerRequest,
          [frame],
        )
      } catch (error) {
        frame.close()
        this.settle((pending) =>
          pending.reject(
            error instanceof Error ? error : new Error(errorMessage(error)),
          ),
        )
      }
    })
  }

  close() {
    this.worker.terminate()
    this.settle((pending) => pending.reject(new Error('Tracking stopped')))
  }

  private settle(finish: (pending: Pending) => void) {
    const pending = this.pending
    this.pending = null
    if (pending) {
      finish(pending)
    }
  }

  private onMessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data
    if (message.type === 'result') {
      this.settle((pending) => pending.resolve(message.detection))
    } else if (message.type === 'error') {
      this.settle((pending) => pending.reject(new Error(message.message)))
    }
  }

  private onError = (event: ErrorEvent) => {
    this.settle((pending) =>
      pending.reject(new Error(event.message || 'Tracking worker crashed')),
    )
  }
}

/** Fallback when workers are unavailable: inference blocks the main thread. */
class MainThreadBackend implements InferenceBackend {
  readonly thread = 'main' as const
  private readonly landmarkers: Landmarkers

  private constructor(landmarkers: Landmarkers) {
    this.landmarkers = landmarkers
  }

  static async create(): Promise<MainThreadBackend> {
    return new MainThreadBackend(await Landmarkers.create())
  }

  get delegate(): Delegate {
    return this.landmarkers.delegate
  }

  async detect(video: HTMLVideoElement, timestamp: number): Promise<Detection> {
    return this.landmarkers.detect(video, timestamp)
  }

  close() {
    this.landmarkers.close()
  }
}

async function createBackend(signal: AbortSignal): Promise<InferenceBackend> {
  if (typeof Worker !== 'undefined' && typeof VideoFrame !== 'undefined') {
    try {
      return await WorkerBackend.create(signal)
    } catch (error) {
      if (signal.aborted) {
        throw error
      }
      console.warn(
        'Tracking worker unavailable, running inference on the main thread:',
        errorMessage(error),
      )
    }
  }
  return MainThreadBackend.create()
}

/**
 * Fire `callback` when the camera has a new frame. Prefers the video
 * frame callback (one call per captured frame) over polling every rAF.
 */
function onNextVideoFrame(
  video: HTMLVideoElement,
  callback: () => void,
): () => void {
  if (typeof video.requestVideoFrameCallback === 'function') {
    const handle = video.requestVideoFrameCallback(() => callback())
    return () => video.cancelVideoFrameCallback(handle)
  }
  const handle = requestAnimationFrame(callback)
  return () => cancelAnimationFrame(handle)
}

export class CameraPipeline {
  private stopped = false
  private readonly abort = new AbortController()
  private stream: MediaStream | null = null
  private backend: InferenceBackend | null = null
  private cancelFrame: (() => void) | null = null
  private inFlight = false
  private lastVideoTime = -1
  private lastTimestamp = 0
  private frames = 0
  private lastFpsAt = 0
  private readonly heads = new HeadTracker()
  private readonly wheels = new WheelTracker()

  async start(video: HTMLVideoElement, overlay: HTMLCanvasElement) {
    trackingStore.setStatus('loading')

    try {
      const backend = await createBackend(this.abort.signal)
      if (this.stopped) {
        backend.close()
        return
      }
      this.backend = backend

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })

      if (this.stopped) {
        this.teardown()
        return
      }

      video.srcObject = this.stream
      video.playsInline = true
      video.muted = true
      await video.play()

      if (this.stopped) {
        this.teardown()
        return
      }

      trackingStore.setStatus('running')
      this.lastFpsAt = performance.now()
      this.schedule(video, overlay)
    } catch (error) {
      this.teardown()
      if (this.stopped) {
        return
      }
      trackingStore.setStatus('error', errorMessage(error))
    }
  }

  stop() {
    this.stopped = true
    this.abort.abort()
    this.teardown()
    trackingStore.setStatus('idle')
  }

  private teardown() {
    this.cancelFrame?.()
    this.cancelFrame = null
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.backend?.close()
    this.backend = null
    this.inFlight = false
    this.heads.reset()
    this.wheels.reset()
  }

  private schedule(video: HTMLVideoElement, overlay: HTMLCanvasElement) {
    this.cancelFrame = onNextVideoFrame(video, () => this.tick(video, overlay))
  }

  private tick(video: HTMLVideoElement, overlay: HTMLCanvasElement) {
    this.cancelFrame = null
    const backend = this.backend
    if (this.stopped || !backend) {
      return
    }

    // One frame in flight at a time. If inference is still busy with the
    // previous frame, drop this one rather than queue behind it, so the
    // camera can never fall progressively further behind real time.
    if (
      !this.inFlight &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.currentTime !== this.lastVideoTime
    ) {
      this.lastVideoTime = video.currentTime
      const timestamp = Math.max(performance.now(), this.lastTimestamp + 1)
      this.lastTimestamp = timestamp
      this.inFlight = true
      backend.detect(video, timestamp).then(
        (detection) => {
          this.inFlight = false
          if (!this.stopped) {
            this.publish(detection, video, overlay)
          }
        },
        (error: unknown) => {
          this.inFlight = false
          if (!this.stopped) {
            this.teardown()
            trackingStore.setStatus('error', errorMessage(error))
          }
        },
      )
    }

    this.schedule(video, overlay)
  }

  private publish(
    detection: Detection,
    video: HTMLVideoElement,
    overlay: HTMLCanvasElement,
  ) {
    const width = video.videoWidth
    const height = video.videoHeight
    const aspect = width / height || 4 / 3
    const head = this.heads.update(detection.face ?? undefined, aspect)
    const { leftHand, rightHand } = readHands(detection)
    const wheel = this.wheels.update(
      detection.hands,
      width,
      height,
      detection.timestamp,
    )

    drawTracking(overlay, video, detection, head, wheel)
    trackingStore.applyFrame({
      head,
      leftHand,
      rightHand,
      wheel,
    })

    this.frames += 1
    const now = performance.now()
    const elapsed = now - this.lastFpsAt
    if (elapsed >= 500) {
      trackingStore.setFps(Math.round((this.frames * 1000) / elapsed))
      this.frames = 0
      this.lastFpsAt = now
    }
  }
}
