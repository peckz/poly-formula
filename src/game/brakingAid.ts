import type { CornerInfo } from './trackPath'
import { monzaPath } from './trackPath'

// Keep in sync with sim.ts: yaw limit ~30 m/s^2, brake decel 46 m/s^2.
export const LAT_ACCEL = 30
export const BRAKE_DECEL = 40 // under the sim's 46 so the advice has margin
export const ENGINE_ACCEL = 26
export const MAX_SPEED = 92

/** Max speed (m/s) each corner can be taken at, from apex curvature. */
export const cornerTargetSpeed: ReadonlyMap<string, number> = new Map(
  monzaPath.corners.map((corner) => {
    const curvature = monzaPath.maxCurvatureNear(corner.s, 60)
    const speed =
      curvature > 0.0001 ? Math.sqrt(LAT_ACCEL / curvature) : MAX_SPEED
    return [corner.id, Math.min(speed, MAX_SPEED)]
  }),
)

export type BrakingAdvice = {
  corner: CornerInfo
  /** Meters to the corner apex. */
  distance: number
  /** m/s the corner can be taken at. */
  targetSpeed: number
  brakeNow: boolean
}

export function brakingAdvice(s: number, speed: number): BrakingAdvice {
  const { corner, distance } = monzaPath.nextCorner(s)
  const targetSpeed = cornerTargetSpeed.get(corner.id) ?? MAX_SPEED

  let brakeNow = false
  if (speed > targetSpeed + 3) {
    const needed =
      (speed * speed - targetSpeed * targetSpeed) / (2 * BRAKE_DECEL) +
      speed * 0.3 // reaction margin
    brakeNow = needed >= distance
  }

  return { corner, distance, targetSpeed, brakeNow }
}

// The sim's actual brake strength; the assist only takes over when even
// full braking would barely make the corner.
const SIM_BRAKE_DECEL = 46
// Assist starts blending this far before the last-possible braking point.
const ASSIST_BLEND = 1.45

/**
 * Safety-net brake (0..1). Zero while the player still has room to brake
 * on their own; ramps to full at the last point where the next corner is
 * still makeable, so a missed braking point costs time, not the run.
 */
export function assistBrake(s: number, speed: number): number {
  const { corner, distance } = monzaPath.nextCorner(s)
  const targetSpeed = cornerTargetSpeed.get(corner.id) ?? MAX_SPEED
  if (speed <= targetSpeed * 1.03) {
    return 0
  }

  const critical =
    ((speed * speed - targetSpeed * targetSpeed) / (2 * SIM_BRAKE_DECEL)) * 1.05
  const start = critical * ASSIST_BLEND
  if (distance >= start) {
    return 0
  }

  return Math.min(1, (start - distance) / Math.max(start - critical, 1))
}
