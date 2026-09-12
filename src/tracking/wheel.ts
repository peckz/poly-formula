import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

const PALM = [0, 5, 9, 13, 17]
const MIN_SPAN = 0.12
const MAX_TILT = Math.PI * 0.4
const VISUAL_SMOOTH = 0.45
const STEER_SMOOTH = 0.35
const GRIP_HOLD_MS = 900
const GRIP_SLACK = 0.1
const LOST_CLEAR_MS = 300
const STEER_DEAD = 3
const STEER_FULL = 57

export type HandPair = {
  x: number
  y: number
  span: number
  angle: number
}

export type WheelFrame = HandPair & {
  held: boolean
  grabbing: boolean
  steering: number
}

function wrapAngle(value: number) {
  let angle = value
  while (angle > Math.PI) {
    angle -= Math.PI * 2
  }
  while (angle < -Math.PI) {
    angle += Math.PI * 2
  }
  return angle
}

function mixAngle(from: number, to: number, t: number) {
  return from + t * wrapAngle(to - from)
}

function palmCenter(hand: NormalizedLandmark[], width: number, height: number) {
  let x = 0
  let y = 0
  let count = 0
  for (const index of PALM) {
    const point = hand[index]
    if (!point) {
      continue
    }
    x += point.x
    y += point.y
    count += 1
  }
  if (count === 0) {
    return null
  }

  return {
    x: (x / count) * width,
    y: (y / count) * height,
  }
}

export function handPair(
  hands: NormalizedLandmark[][],
  width: number,
  height: number,
): HandPair | null {
  if (hands.length !== 2) {
    return null
  }

  const centers = []
  for (const hand of hands) {
    const center = palmCenter(hand, width, height)
    if (!center) {
      return null
    }
    centers.push(center)
  }
  centers.sort((a, b) => a.x - b.x)

  const [left, right] = centers
  const dx = right.x - left.x
  const dy = right.y - left.y
  const angle = Math.atan2(dy, dx)
  if (dx < width * MIN_SPAN || Math.abs(angle) > MAX_TILT) {
    return null
  }

  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    span: Math.hypot(dx, dy),
    angle,
  }
}

export function steeringValue(angle: number, neutral: number) {
  const degrees = -(wrapAngle(angle - neutral) * 180) / Math.PI
  if (Math.abs(degrees) <= STEER_DEAD) {
    return 0
  }

  return (
    Math.sign(degrees) *
    Math.min(1, Math.max(0, Math.abs(degrees) - STEER_DEAD) / STEER_FULL)
  )
}

const idleWheel = (): WheelFrame => ({
  held: false,
  grabbing: false,
  x: 0,
  y: 0,
  span: 0,
  angle: 0,
  steering: 0,
})

export class WheelTracker {
  private visual: HandPair | null = null
  private steering = 0
  private neutral: number | null = null
  private gripAngle: number | null = null
  private gripSince = 0
  private lostAt = 0

  update(
    hands: NormalizedLandmark[][],
    width: number,
    height: number,
    now: number,
  ): WheelFrame {
    const pair = handPair(hands, width, height)
    if (!pair) {
      return this.lost(now)
    }

    this.lostAt = 0
    this.visual = this.visual
      ? {
          x: this.visual.x + VISUAL_SMOOTH * (pair.x - this.visual.x),
          y: this.visual.y + VISUAL_SMOOTH * (pair.y - this.visual.y),
          span: this.visual.span + VISUAL_SMOOTH * (pair.span - this.visual.span),
          angle: mixAngle(this.visual.angle, pair.angle, VISUAL_SMOOTH),
        }
      : pair

    if (this.neutral === null) {
      if (
        this.gripAngle === null ||
        Math.abs(wrapAngle(pair.angle - this.gripAngle)) > GRIP_SLACK
      ) {
        this.gripAngle = pair.angle
        this.gripSince = now
      } else if (now - this.gripSince >= GRIP_HOLD_MS) {
        this.neutral = this.gripAngle
      }
    }

    const target =
      this.neutral === null ? 0 : steeringValue(pair.angle, this.neutral)
    this.steering += STEER_SMOOTH * (target - this.steering)

    return {
      held: true,
      grabbing: this.neutral === null,
      ...this.visual,
      steering: this.steering,
    }
  }

  reset() {
    this.visual = null
    this.steering = 0
    this.neutral = null
    this.gripAngle = null
    this.gripSince = 0
    this.lostAt = 0
  }

  private lost(now: number): WheelFrame {
    if (this.lostAt === 0) {
      this.lostAt = now
    }

    this.steering += STEER_SMOOTH * (0 - this.steering)
    if (now - this.lostAt > LOST_CLEAR_MS) {
      this.neutral = null
      this.gripAngle = null
      this.visual = null
    }

    if (!this.visual) {
      return idleWheel()
    }

    return {
      held: false,
      grabbing: false,
      ...this.visual,
      steering: this.steering,
    }
  }
}
