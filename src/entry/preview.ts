import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { makeAutoObservable } from 'mobx'
import { HeadTracker, type HeadFrame } from '../tracking/face'

const WASM_PATH = '/mediapipe/wasm'
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export type PreviewStatus = 'idle' | 'starting' | 'live' | 'denied'

/**
 * Head pose for the entry screen avatar. Fed by an invisible camera stream so
 * the picked driver "comes alive" before the race — the wow moment.
 */
class EntryPreviewStore {
  status: PreviewStatus = 'idle'
  detected = false
  calibrating = false
  yaw = 0
  pitch = 0
  col = 2
  row = 2

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  setStatus(status: PreviewStatus) {
    this.status = status
  }

  applyHead(frame: HeadFrame) {
    this.detected = frame.detected
    this.calibrating = frame.calibrating
    this.yaw = frame.yaw
    this.pitch = frame.pitch
    this.col = frame.col
    this.row = frame.row
  }

  reset() {
    this.detected = false
    this.calibrating = false
    this.yaw = 0
    this.pitch = 0
    this.col = 2
    this.row = 2
  }
}

export const entryPreview = new EntryPreviewStore()

async function createFaceLandmarker(delegate: 'GPU' | 'CPU') {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: FACE_MODEL, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.6,
    minFacePresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  })
}

/** Face-only tracking loop for the entry screen (no hands, no overlay). */
export class EntryPreviewPipeline {
  private stopped = false
  private raf = 0
  private stream: MediaStream | null = null
  private face: FaceLandmarker | null = null
  private heads = new HeadTracker()
  private lastVideoTime = -1
  private lastTimestamp = 0

  async start(video: HTMLVideoElement) {
    entryPreview.setStatus('starting')

    try {
      let face: FaceLandmarker
      try {
        face = await createFaceLandmarker('GPU')
      } catch {
        face = await createFaceLandmarker('CPU')
      }

      if (this.stopped) {
        face.close()
        return
      }
      this.face = face

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

      entryPreview.setStatus('live')
      this.loop(video)
    } catch {
      this.teardown()
      if (!this.stopped) {
        entryPreview.setStatus('denied')
      }
    }
  }

  stop() {
    this.stopped = true
    this.teardown()
    entryPreview.setStatus('idle')
    entryPreview.reset()
  }

  private teardown() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.face?.close()
    this.face = null
    this.heads.reset()
  }

  private loop = (video: HTMLVideoElement) => {
    if (this.stopped || !this.face) {
      return
    }

    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.currentTime !== this.lastVideoTime
    ) {
      this.lastVideoTime = video.currentTime
      const timestamp = Math.max(performance.now(), this.lastTimestamp + 1)
      this.lastTimestamp = timestamp

      const result = this.face.detectForVideo(video, timestamp)
      const aspect = video.videoWidth / video.videoHeight || 4 / 3
      const frame = this.heads.update(result.faceLandmarks[0], aspect)
      entryPreview.applyHead(frame)
    }

    this.raf = requestAnimationFrame(() => this.loop(video))
  }
}
