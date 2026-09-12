import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { Detection } from './inference'
import type { Point3 } from './store'

const WRIST = 0

const undetectedPoint = (): Point3 => ({
  detected: false,
  x: 0,
  y: 0,
  z: 0,
})

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

export function readHands(detection: Detection): {
  leftHand: Point3
  rightHand: Point3
} {
  let leftHand = undetectedPoint()
  let rightHand = undetectedPoint()

  for (let i = 0; i < detection.hands.length; i += 1) {
    const landmarks = detection.hands[i]
    const label = detection.handedness[i]
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
