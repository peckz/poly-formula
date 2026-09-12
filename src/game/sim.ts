import { KERB_OUTER } from './trackModel'
import { monzaPath } from './trackPath'

export type SimControls = {
  /** 0..1 */
  throttle: number
  /** 0..1 */
  brake: number
  /** -1..1, positive = left */
  steer: number
}

const MAX_SPEED = 92 // m/s, ~330 km/h
const ENGINE = 26 // m/s^2 at low speed
const DRAG = ENGINE / (MAX_SPEED * MAX_SPEED) // balances engine at top speed
const ROLLING = 1.4
const OFF_TRACK_DRAG = 14
const BRAKE_DECEL = 46
const SPAWN_S = monzaPath.length - 60 // on the grid, just before the line

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Heading so that the sim's forward (-sin h, -cos h) matches a tangent. */
function headingFromTangent(tx: number, tz: number) {
  return Math.atan2(-tx, -tz)
}

/**
 * Arcade point-mass car, free in the x/z plane; the track path only
 * provides off-track detection and lap progress. Heading 0 faces -z and
 * positive heading turns left.
 */
export class CarSim {
  x = 0
  z = 0
  heading = 0
  speed = 0
  steer = 0
  lap = 0
  /** Arc length along the lap at the nearest centerline point. */
  s = SPAWN_S
  distFromCenter = 0

  constructor() {
    this.resetToTrack(SPAWN_S)
  }

  get offTrack(): boolean {
    return this.distFromCenter > KERB_OUTER
  }

  /** Drop the car back onto the centerline, pointing down the track. */
  resetToTrack(atS?: number) {
    const s = atS ?? this.s
    const sample = monzaPath.sampleAt(s)
    this.x = sample.x
    this.z = sample.z
    this.heading = headingFromTangent(sample.tx, sample.tz)
    this.speed = 0
    this.steer = 0
    this.s = s
    this.distFromCenter = 0
  }

  step(dt: number, controls: SimControls) {
    const target = clamp(controls.steer, -1, 1)
    this.steer += (target - this.steer) * Math.min(1, dt * 9)

    // Forward-only: brakes bring the car to a stop, never into reverse.
    let force = controls.throttle * ENGINE * (this.offTrack ? 0.35 : 1)
    if (controls.brake > 0 && this.speed > 0) {
      force -= BRAKE_DECEL * controls.brake
    }
    force -= DRAG * this.speed * this.speed
    if (this.speed > 0.05) {
      force -= this.offTrack ? OFF_TRACK_DRAG : ROLLING
    }

    this.speed = clamp(this.speed + force * dt, 0, MAX_SPEED)

    // Grip-limited yaw: quick at parking speed, gentle at 300 km/h.
    const yawRate =
      this.steer *
      Math.min(1.6, 30 / Math.max(this.speed, 2)) *
      Math.min(1, this.speed / 4)
    this.heading += yawRate * dt

    this.x -= Math.sin(this.heading) * this.speed * dt
    this.z -= Math.cos(this.heading) * this.speed * dt

    const previousS = this.s
    const nearest = monzaPath.nearest(this.x, this.z)
    this.s = nearest.s
    this.distFromCenter = nearest.distance

    // Lap line crossing (with hysteresis so wandering near the line
    // does not double count).
    const quarter = monzaPath.length / 4
    if (previousS > monzaPath.length - quarter && this.s < quarter) {
      this.lap += 1
    } else if (this.s > monzaPath.length - quarter && previousS < quarter) {
      this.lap = Math.max(0, this.lap - 1)
    }
  }
}
