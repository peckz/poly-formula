import { makeAutoObservable } from 'mobx'

export type CameraStatus = 'idle' | 'loading' | 'running' | 'error'

export type Point3 = {
  detected: boolean
  x: number
  y: number
  z: number
}

export type HeadPose = {
  detected: boolean
  calibrating: boolean
  yaw: number
  pitch: number
  col: number
  row: number
  forward: number
  sideways: number
}

const emptyPoint = (): Point3 => ({
  detected: false,
  x: 0,
  y: 0,
  z: 0,
})

const emptyHead = (): HeadPose => ({
  detected: false,
  calibrating: false,
  yaw: 0,
  pitch: 0,
  col: 2,
  row: 2,
  forward: 0,
  sideways: 0,
})

function writePoint(target: Point3, source: Point3) {
  target.detected = source.detected
  target.x = source.x
  target.y = source.y
  target.z = source.z
}

function writeHead(target: HeadPose, source: HeadPose) {
  target.detected = source.detected
  target.calibrating = source.calibrating
  target.yaw = source.yaw
  target.pitch = source.pitch
  target.col = source.col
  target.row = source.row
  target.forward = source.forward
  target.sideways = source.sideways
}

class TrackingStore {
  status: CameraStatus = 'idle'
  error: string | null = null
  fps = 0
  head: HeadPose = emptyHead()
  leftHand: Point3 = emptyPoint()
  rightHand: Point3 = emptyPoint()
  wheelAngle: number | null = null

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  setStatus(status: CameraStatus, error: string | null = null) {
    this.status = status
    this.error = error
  }

  setFps(fps: number) {
    this.fps = fps
  }

  applyFrame(frame: {
    head: HeadPose
    leftHand: Point3
    rightHand: Point3
    wheelAngle: number | null
  }) {
    writeHead(this.head, frame.head)
    writePoint(this.leftHand, frame.leftHand)
    writePoint(this.rightHand, frame.rightHand)
    this.wheelAngle = frame.wheelAngle
  }
}

export const trackingStore = new TrackingStore()
