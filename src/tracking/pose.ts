import type {
  HandLandmarkerResult,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import type { Point3 } from './store'

const WRIST = 0

const undetectedPoint = (): Point3 => ({
  detected: false,
  x: 0,
  y: 0,
  z: 0,
})

function toDeg(rad: number) {
  return (rad * 180) / Math.PI
}

function mirrorX(x: number) {
  return 1 - x
}

function fromLandmark(landmark: NormalizedLandmark): Point3 {
  return {
    detected: true,
    x: mirrorX(landmark.x),
    y: landmark.y,
    z: landmark.z,
  }
}

export function readHands(result: HandLandmarkerResult): {
  leftHand: Point3
  rightHand: Point3
} {
  let leftHand = undetectedPoint()
  let rightHand = undetectedPoint()

  for (let i = 0; i < result.landmarks.length; i += 1) {
    const landmarks = result.landmarks[i]
    const label = result.handedness[i]?.[0]?.categoryName
    const wrist = landmarks[WRIST]
    if (!wrist || !label) {
      continue
    }

    if (label === 'Left') {
      leftHand = fromLandmark(wrist)
    }
    if (label === 'Right') {
      rightHand = fromLandmark(wrist)
    }
  }

  return { leftHand, rightHand }
}

export function readWheelAngle(leftHand: Point3, rightHand: Point3): number | null {
  if (!leftHand.detected || !rightHand.detected) {
    return null
  }

  const dx = rightHand.x - leftHand.x
  const dy = rightHand.y - leftHand.y
  return toDeg(Math.atan2(-dy, dx))
}
