import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

const NOSE = 1
const UPPER_LIP = 13
const LEFT_EYE = 33
const RIGHT_EYE = 263
const LEFT_CHEEK = 234
const RIGHT_CHEEK = 454

const CALIBRATE_SAMPLES = 30
const DEPTH_RANGE = 0.3
const SIDE_RANGE = 0.2
const DEAD_ZONE = 0.04
const YAW_RANGE = 0.22
const PITCH_RANGE = 0.28
const HEAD_SMOOTH = 0.75
const MOTION_SMOOTH = 0.25
const FRAME_HOLD = 0.62

export type FaceMeasure = {
  size: number
  x: number
}

export type HeadMeasure = {
  yaw: number
  pitch: number
}

export type HeadState = {
  yaw: number
  pitch: number
  col: number
  row: number
}

export type Motion = {
  forward: number
  sideways: number
}

export type HeadFrame = HeadState &
  Motion & {
    detected: boolean
    calibrating: boolean
  }

const idleHead = (): HeadState => ({
  yaw: 0,
  pitch: 0,
  col: 2,
  row: 2,
})

const idleMotion = (): Motion => ({
  forward: 0,
  sideways: 0,
})

function pointAt(points: NormalizedLandmark[], index: number) {
  return points[index]
}

export function measureFace(
  landmarks: NormalizedLandmark[],
  aspectRatio = 4 / 3,
): FaceMeasure | null {
  const left = pointAt(landmarks, LEFT_CHEEK)
  const right = pointAt(landmarks, RIGHT_CHEEK)
  if (!left || !right) {
    return null
  }

  const size = Math.hypot((right.x - left.x) * aspectRatio, right.y - left.y)
  const x = (left.x + right.x) / 2

  if (!Number.isFinite(size) || !Number.isFinite(x) || size <= 0.001) {
    return null
  }

  return { size, x }
}

export function measureHead(points: NormalizedLandmark[]): HeadMeasure | null {
  const nose = pointAt(points, NOSE)
  const leftEye = pointAt(points, LEFT_EYE)
  const rightEye = pointAt(points, RIGHT_EYE)
  const lip = pointAt(points, UPPER_LIP)
  const leftCheek = pointAt(points, LEFT_CHEEK)
  const rightCheek = pointAt(points, RIGHT_CHEEK)
  if (!nose || !leftEye || !rightEye || !lip || !leftCheek || !rightCheek) {
    return null
  }

  const eyeX = (leftEye.x + rightEye.x) / 2
  const eyeY = (leftEye.y + rightEye.y) / 2
  const width = Math.abs(rightCheek.x - leftCheek.x)
  const height = lip.y - eyeY
  if (width < 0.01 || height < 0.01) {
    return null
  }

  return {
    yaw: (eyeX - nose.x) / width,
    pitch: (nose.y - eyeY) / height,
  }
}

function normalize(value: number) {
  const bounded = Math.max(-1, Math.min(1, value))
  if (Math.abs(bounded) <= DEAD_ZONE) {
    return 0
  }

  return (
    Math.sign(bounded) * (Math.abs(bounded) - DEAD_ZONE) / (1 - DEAD_ZONE)
  )
}

export function getMotion(current: FaceMeasure, neutral: FaceMeasure): Motion {
  return {
    forward: normalize((current.size / neutral.size - 1) / DEPTH_RANGE),
    sideways: normalize((neutral.x - current.x) / SIDE_RANGE),
  }
}

export function smoothMotion(previous: Motion, next: Motion): Motion {
  const smooth = (a: number, b: number) => {
    const value = a + MOTION_SMOOTH * (b - a)
    return Math.abs(value) < 0.001 ? 0 : value
  }

  return {
    forward: smooth(previous.forward, next.forward),
    sideways: smooth(previous.sideways, next.sideways),
  }
}

export function selectFrame(value: number, previous = 2) {
  const position = Math.max(0, Math.min(4, 2 + value * 2))
  if (Math.abs(position - previous) > FRAME_HOLD) {
    return Math.round(position)
  }

  return previous
}

export function updateHead(
  current: HeadMeasure,
  neutral: HeadMeasure,
  previous: HeadState,
): HeadState {
  const yaw =
    previous.yaw + HEAD_SMOOTH * ((current.yaw - neutral.yaw) / YAW_RANGE - previous.yaw)
  const pitch =
    previous.pitch +
    HEAD_SMOOTH * ((neutral.pitch - current.pitch) / PITCH_RANGE - previous.pitch)

  return {
    yaw,
    pitch,
    col: selectFrame(yaw, previous.col),
    row: selectFrame(pitch, previous.row),
  }
}

function averageFace(samples: FaceMeasure[]): FaceMeasure {
  let size = 0
  let x = 0
  for (const sample of samples) {
    size += sample.size
    x += sample.x
  }

  return {
    size: size / samples.length,
    x: x / samples.length,
  }
}

function averageHead(samples: HeadMeasure[]): HeadMeasure {
  let yaw = 0
  let pitch = 0
  for (const sample of samples) {
    yaw += sample.yaw
    pitch += sample.pitch
  }

  return {
    yaw: yaw / samples.length,
    pitch: pitch / samples.length,
  }
}

export class HeadTracker {
  private faceSamples: FaceMeasure[] = []
  private headSamples: HeadMeasure[] = []
  private faceNeutral: FaceMeasure | null = null
  private headNeutral: HeadMeasure | null = null
  private motion = idleMotion()
  private head = idleHead()

  update(landmarks: NormalizedLandmark[] | undefined, aspectRatio: number): HeadFrame {
    const face = landmarks ? measureFace(landmarks, aspectRatio) : null
    const measured = landmarks ? measureHead(landmarks) : null
    if (!face || !measured) {
      this.lostFace()
      return this.frame(false)
    }

    if (!this.faceNeutral || !this.headNeutral) {
      this.faceSamples.push(face)
      this.headSamples.push(measured)
      if (this.faceSamples.length >= CALIBRATE_SAMPLES) {
        this.faceNeutral = averageFace(this.faceSamples)
        this.headNeutral = averageHead(this.headSamples)
      }
      this.head = idleHead()
      this.motion = idleMotion()
      return this.frame(true)
    }

    this.motion = smoothMotion(this.motion, getMotion(face, this.faceNeutral))
    this.head = updateHead(measured, this.headNeutral, this.head)
    return this.frame(true)
  }

  reset() {
    this.faceSamples = []
    this.headSamples = []
    this.faceNeutral = null
    this.headNeutral = null
    this.lostFace()
  }

  private lostFace() {
    this.head = idleHead()
    this.motion = idleMotion()
  }

  private frame(detected: boolean): HeadFrame {
    const calibrating = !this.faceNeutral || !this.headNeutral
    return {
      detected,
      calibrating: detected && calibrating,
      ...this.head,
      ...this.motion,
    }
  }
}
