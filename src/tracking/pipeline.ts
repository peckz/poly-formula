import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
} from '@mediapipe/tasks-vision'
import { drawTracking } from './draw'
import { HeadTracker } from './face'
import { readHands } from './pose'
import { trackingStore } from './store'
import { WheelTracker } from './wheel'

const WASM_PATH = '/mediapipe/wasm'
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const HAND_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

async function createLandmarkers(delegate: 'GPU' | 'CPU') {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH)

  const face = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: FACE_MODEL, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.6,
    minFacePresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  })

  const hands = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: HAND_MODEL, delegate },
    runningMode: 'VIDEO',
    numHands: 2,
  })

  return { face, hands }
}

export class CameraPipeline {
  private stopped = false
  private raf = 0
  private stream: MediaStream | null = null
  private face: FaceLandmarker | null = null
  private hands: HandLandmarker | null = null
  private lastVideoTime = -1
  private lastTimestamp = 0
  private frames = 0
  private lastFpsAt = 0
  private heads = new HeadTracker()
  private wheels = new WheelTracker()

  async start(video: HTMLVideoElement, overlay: HTMLCanvasElement) {
    trackingStore.setStatus('loading')

    try {
      let landmarkers: { face: FaceLandmarker; hands: HandLandmarker }
      try {
        landmarkers = await createLandmarkers('GPU')
      } catch {
        landmarkers = await createLandmarkers('CPU')
      }

      if (this.stopped) {
        landmarkers.face.close()
        landmarkers.hands.close()
        return
      }

      this.face = landmarkers.face
      this.hands = landmarkers.hands

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
      this.loop(video, overlay)
    } catch (error) {
      this.teardown()
      if (this.stopped) {
        return
      }
      const message = error instanceof Error ? error.message : 'Camera failed'
      trackingStore.setStatus('error', message)
    }
  }

  stop() {
    this.stopped = true
    this.teardown()
    trackingStore.setStatus('idle')
  }

  private teardown() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.face?.close()
    this.hands?.close()
    this.face = null
    this.hands = null
    this.heads.reset()
    this.wheels.reset()
  }

  private loop = (video: HTMLVideoElement, overlay: HTMLCanvasElement) => {
    if (this.stopped || !this.face || !this.hands) {
      return
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      if (video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = video.currentTime
        const timestamp = Math.max(performance.now(), this.lastTimestamp + 1)
        this.lastTimestamp = timestamp

        const face = this.face.detectForVideo(video, timestamp)
        const hands = this.hands.detectForVideo(video, timestamp)
        const aspect = video.videoWidth / video.videoHeight || 4 / 3
        const head = this.heads.update(face.faceLandmarks[0], aspect)
        const { leftHand, rightHand } = readHands(hands)
        const wheel = this.wheels.update(
          hands.landmarks,
          video.videoWidth,
          video.videoHeight,
          timestamp,
        )

        drawTracking(overlay, video, face, hands, head, wheel)
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

    this.raf = requestAnimationFrame(() => this.loop(video, overlay))
  }
}
