import { DRIVERS, PLAYER_DRIVER_ID, type Driver } from './drivers'
import { SPAWN_S } from './sim'
import { monzaPath, type TrackPath } from './trackPath'

const ROW_GAP_M = 8
const LATERAL_M = 2.6

export type GridSlot = {
  driver: Driver
  s: number
  x: number
  z: number
  heading: number
  offsetM: number
}

export type GridLook = {
  x: number
  y: number
  z: number
  lookX: number
  lookY: number
  lookZ: number
}

/** Heading so that the car's forward (-sin h, -cos h) matches a tangent. */
function headingFromTangent(tx: number, tz: number) {
  return Math.atan2(-tx, -tz)
}

/**
 * F1-style staggered grid just before S/F. P1 sits at the player spawn
 * station, pole-side left (Monza racing line). Visual only — no physics.
 */
export function buildGridSlots(path: TrackPath = monzaPath): GridSlot[] {
  return DRIVERS.map((driver, index) => {
    const s = SPAWN_S - index * ROW_GAP_M
    const offsetM = index % 2 === 0 ? -LATERAL_M : LATERAL_M
    const sample = path.sampleAt(s)
    const rightX = -sample.tz
    const rightZ = sample.tx
    return {
      driver,
      s,
      x: sample.x + rightX * offsetM,
      z: sample.z + rightZ * offsetM,
      heading: headingFromTangent(sample.tx, sample.tz),
      offsetM,
    }
  })
}

export function playerSlot(slots: GridSlot[]): GridSlot {
  const slot = slots.find((entry) => entry.driver.id === PLAYER_DRIVER_ID)
  if (!slot) {
    throw new Error(`Player driver ${PLAYER_DRIVER_ID} missing from grid`)
  }
  return slot
}

/**
 * Close 3/4 of the front of the grid so papaya / teal / navy / red read
 * as cars, not specks. Fog starts at 180 m; stay well inside that.
 */
export function gridLook(slots: GridSlot[], path: TrackPath = monzaPath): GridLook {
  const anchor = slots[6] ?? slots[0]
  const target = slots[2] ?? slots[0]
  if (!anchor || !target) {
    throw new Error('Grid is empty')
  }
  const sample = path.sampleAt(anchor.s)
  const rightX = -sample.tz
  const rightZ = sample.tx
  return {
    x: anchor.x + rightX * 12 - sample.tx * 10,
    y: 4.2,
    z: anchor.z + rightZ * 12 - sample.tz * 10,
    lookX: target.x,
    lookY: 0.55,
    lookZ: target.z,
  }
}
