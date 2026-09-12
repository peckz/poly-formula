import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

const PALM = [0, 5, 9, 13, 17]
const MIN_SPAN = 0.12
const MAX_TILT = Math.PI * 0.4
const VISUAL_SMOOTH = 0.45
const STEER_SMOOTH = 0.45
const GRIP_HOLD_MS = 600
const GRIP_SLACK = 0.1
// Keep the calibrated neutral through short tracking dropouts so the
// player does not have to re-grip after every flicker.
const LOST_CLEAR_MS = 1500
const STEER_DEAD = 2
const STEER_FULL = 32
// Response curve: precise near center, quicker toward full lock.
const STEER_EXPO = 1.35
// Longitudinal gesture: pull hands back (smaller on camera) = cautious,
// push forward (larger) = attack. Deadzone keeps idle hands neutral.
const LONG_DEAD = 0.05
const LONG_FULL = 0.2
const LONG_SMOOTH = 0.4
const LONG_SNAP = 0.04
// Slow drift correction so slouching closer/further does not become a
// phantom aggression over time.
const SIZE_ADAPT = 0.008

export type HandPair = {
  x: number
  y: number
  span: number
  angle: number
  /** Average palm size in pixels; grows as hands come toward the camera. */
  size: number
}

export type WheelFrame = HandPair & {
  held: boolean
  grabbing: boolean
  steering: number
  /**
   * -1..1 longitudinal aggression: negative = pull-back (cautious),
   * positive = push-forward (attack).
   */
  longitudinal: number
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

/** Wrist to middle-finger-base distance: a hand-separation-free size cue. */
function palmSize(hand: NormalizedLandmark[], width: number, height: number) {
  const wrist = hand[0]
  const middle = hand[9]
  if (!wrist || !middle) {
    return 0
  }

  return Math.hypot(
    (middle.x - wrist.x) * width,
    (middle.y - wrist.y) * height,
  )
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
  let size = 0
  for (const hand of hands) {
    const center = palmCenter(hand, width, height)
    if (!center) {
      return null
    }
    centers.push(center)
    size += palmSize(hand, width, height) / 2
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
    size,
  }
}

export function steeringValue(angle: number, neutral: number) {
  const degrees = -(wrapAngle(angle - neutral) * 180) / Math.PI
  if (Math.abs(degrees) <= STEER_DEAD) {
    return 0
  }

  const linear = Math.min(
    1,
    Math.max(0, Math.abs(degrees) - STEER_DEAD) / STEER_FULL,
  )
  return Math.sign(degrees) * Math.pow(linear, STEER_EXPO)
}

/** Map size-relative pull (+ shrink) / push (− grow) into −1..1 aggression. */
export function longitudinalValue(pull: number) {
  if (Math.abs(pull) <= LONG_DEAD) {
    return 0
  }
  const signed = -Math.sign(pull) // push (negative pull) → positive aggression
  const magnitude = Math.min(
    1,
    Math.max(0, (Math.abs(pull) - LONG_DEAD) / (LONG_FULL - LONG_DEAD)),
  )
  return signed * magnitude
}

const idleWheel = (): WheelFrame => ({
  held: false,
  grabbing: false,
  x: 0,
  y: 0,
  span: 0,
  angle: 0,
  size: 0,
  steering: 0,
  longitudinal: 0,
})

export class WheelTracker {
  private visual: HandPair | null = null
  private steering = 0
  private longitudinal = 0
  private neutral: number | null = null
  private neutralSize = 0
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
          size: this.visual.size + VISUAL_SMOOTH * (pair.size - this.visual.size),
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
        this.neutralSize = pair.size
      }
    }

    const target =
      this.neutral === null ? 0 : steeringValue(pair.angle, this.neutral)
    this.steering += STEER_SMOOTH * (target - this.steering)

    let longTarget = 0
    if (this.neutral !== null && this.neutralSize > 0) {
      // Positive when hands shrink (pull back away from the camera).
      const pull = 1 - pair.size / this.neutralSize
      if (Math.abs(pull) < LONG_DEAD * 0.5) {
        this.neutralSize += SIZE_ADAPT * (pair.size - this.neutralSize)
      }
      longTarget = longitudinalValue(pull)
    }
    this.longitudinal += LONG_SMOOTH * (longTarget - this.longitudinal)
    if (longTarget === 0 && Math.abs(this.longitudinal) < LONG_SNAP) {
      this.longitudinal = 0
    }

    return {
      held: true,
      grabbing: this.neutral === null,
      ...this.visual,
      steering: this.steering,
      longitudinal: this.longitudinal,
    }
  }

  reset() {
    this.visual = null
    this.steering = 0
    this.longitudinal = 0
    this.neutral = null
    this.neutralSize = 0
    this.gripAngle = null
    this.gripSince = 0
    this.lostAt = 0
  }

  private lost(now: number): WheelFrame {
    if (this.lostAt === 0) {
      this.lostAt = now
    }

    this.steering += STEER_SMOOTH * (0 - this.steering)
    this.longitudinal += LONG_SMOOTH * (0 - this.longitudinal)
    if (now - this.lostAt > LOST_CLEAR_MS) {
      this.neutral = null
      this.neutralSize = 0
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
      longitudinal: this.longitudinal,
    }
  }
}
