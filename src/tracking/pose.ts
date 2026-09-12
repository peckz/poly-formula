import type {
  FaceLandmarkerResult,
  HandLandmarkerResult,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import type { HeadPose, Point3 } from './store'

const NOSE_TIP = 4
const WRIST = 0

const undetectedPoint = (): Point3 => ({
  detected: false,
  x: 0,
  y: 0,
  z: 0,
})

const undetectedHead = (): HeadPose => ({
  ...undetectedPoint(),
  yaw: 0,
  pitch: 0,
  roll: 0,
})

function toDeg(rad: number) {
  return (rad * 180) / Math.PI
}

function mirrorX(x: number) {
  return 1 - x
}

function eulerFromMatrix(data: number[]) {
  const r00 = data[0]
  const r01 = data[1]
  const r10 = data[4]
  const r11 = data[5]
  const r20 = data[8]
  const r21 = data[9]
  const r22 = data[10]
  const sy = Math.hypot(r00, r10)

  let yaw: number
  let pitch: number
  let roll: number

  if (sy > 1e-6) {
    yaw = Math.atan2(r10, r00)
    pitch = Math.atan2(-r20, sy)
    roll = Math.atan2(r21, r22)
  } else {
    yaw = Math.atan2(-r01, r11)
    pitch = Math.atan2(-r20, sy)
    roll = 0
  }

  return {
    yaw: -toDeg(yaw),
    pitch: toDeg(pitch),
    roll: -toDeg(roll),
  }
}

function fromLandmark(landmark: NormalizedLandmark): Point3 {
  return {
    detected: true,
    x: mirrorX(landmark.x),
    y: landmark.y,
    z: landmark.z,
  }
}

export function readHead(result: FaceLandmarkerResult): HeadPose {
  const landmarks = result.faceLandmarks[0]
  if (!landmarks) {
    return undetectedHead()
  }

  const nose = landmarks[NOSE_TIP]
  const matrix = result.facialTransformationMatrixes[0]
  const pose = matrix ? eulerFromMatrix(matrix.data) : { yaw: 0, pitch: 0, roll: 0 }

  return {
    ...fromLandmark(nose),
    ...pose,
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
