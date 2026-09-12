import { KERB_OUTER, TRACK_HALF, TRACK_LENGTH } from './trackModel'

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
const REVERSE_ACCEL = 12
const REVERSE_MAX = 10
const GRASS_LIMIT = 15 // walls sit at ±16

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Arcade point-mass car on the straight. World: x lateral, z along the
 * track; heading 0 faces -z and positive heading turns left.
 */
export class CarSim {
  x = 0
  z = TRACK_HALF * 0.8
  heading = 0
  speed = 0
  steer = 0
  lap = 1

  get offTrack(): boolean {
    return Math.abs(this.x) > KERB_OUTER
  }

  step(dt: number, controls: SimControls) {
    const target = clamp(controls.steer, -1, 1)
    this.steer += (target - this.steer) * Math.min(1, dt * 9)

    let force = controls.throttle * ENGINE * (this.offTrack ? 0.35 : 1)
    if (controls.brake > 0) {
      if (this.speed > 0.3) {
        force -= BRAKE_DECEL * controls.brake
      } else {
        force -= REVERSE_ACCEL * controls.brake
      }
    }
    force -= DRAG * this.speed * Math.abs(this.speed)
    if (Math.abs(this.speed) > 0.05) {
      force -= Math.sign(this.speed) * (this.offTrack ? OFF_TRACK_DRAG : ROLLING)
    }

    this.speed = clamp(this.speed + force * dt, -REVERSE_MAX, MAX_SPEED)
    if (
      controls.throttle === 0 &&
      controls.brake === 0 &&
      Math.abs(this.speed) < 0.15
    ) {
      this.speed = 0
    }

    // Grip-limited yaw: quick at parking speed, gentle at 300 km/h.
    const absSpeed = Math.abs(this.speed)
    const yawRate =
      this.steer *
      Math.min(1.6, 30 / Math.max(absSpeed, 2)) *
      Math.min(1, absSpeed / 4) *
      Math.sign(this.speed || 1)
    this.heading += yawRate * dt

    this.x -= Math.sin(this.heading) * this.speed * dt
    this.z -= Math.cos(this.heading) * this.speed * dt

    if (Math.abs(this.x) > GRASS_LIMIT) {
      this.x = clamp(this.x, -GRASS_LIMIT, GRASS_LIMIT)
      this.speed *= 0.985
    }

    // Loop the straight so you can keep flat out forever.
    if (this.z < -TRACK_HALF) {
      this.z += TRACK_LENGTH
      this.lap += 1
    } else if (this.z > TRACK_HALF) {
      this.z -= TRACK_LENGTH
      this.lap = Math.max(1, this.lap - 1)
    }
  }
}
