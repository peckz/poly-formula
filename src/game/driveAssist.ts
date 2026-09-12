import { computeSpeedProfile } from './racingLine'
import { BRAKE_DECEL, ENGINE, MAX_SPEED } from './sim'
import type { SimControls } from './sim'
import type { TrackPath } from './trackPath'

/** Conservative grip so envelope corners stay makeable with raised yaw. */
export const ENVELOPE_LAT_ACCEL = 26

const S_WINDOW_M = 14
const LOOKAHEAD_M = 100
/** Match ROAD_HALF_WIDTH in trackModel (avoid a circular import). */
const ROAD_HALF = 5.5
/** Mild: a messy line costs a little speed, not a crawl. */
const LATERAL_SLOW = 0.12
/** Extra speed when spending boost on an otherwise clean envelope. */
const BOOST_SCALE = 1.1
const P_THROTTLE = 12
const P_BRAKE = 8

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function pathSpacing(path: TrackPath): number {
  return path.length / path.points.length
}

/**
 * Centerline speed envelope (m/s per path point). Built once at load with
 * the same two-pass grip / engine / brake profile as the ghost line, but
 * with lower lateral grip so the car can always turn the corner. A short
 * min-filter absorbs nearest-s jitter around chicanes.
 */
export function buildSpeedEnvelope(path: TrackPath): Float64Array {
  const line = path.points.map((p) => ({ x: p.x, z: p.z }))
  const speeds = computeSpeedProfile(
    line,
    ENVELOPE_LAT_ACCEL,
    BRAKE_DECEL,
    ENGINE,
    MAX_SPEED,
  ).speeds

  const n = speeds.length
  const half = Math.max(1, Math.ceil(S_WINDOW_M / pathSpacing(path)))
  const filtered = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let min = Infinity
    for (let k = -half; k <= half; k++) {
      min = Math.min(min, speeds[(i + k + n * 4) % n])
    }
    filtered[i] = min
  }
  return filtered
}

/**
 * Look-ahead allowed speed at the current position. Pedals are fully
 * automatic — boost is the only optional skill multiplier.
 */
export function allowedSpeed(opts: {
  envelope: Float64Array
  path: TrackPath
  s: number
  distFromCenter: number
  boost: number
}): number {
  const { envelope, path, s, distFromCenter, boost } = opts
  const n = envelope.length
  const spacing = pathSpacing(path)
  const steps = Math.max(1, Math.ceil(LOOKAHEAD_M / spacing))
  const start = path.indexAt(s)

  let cap = Infinity
  for (let k = 0; k <= steps; k++) {
    const i = (start + k) % n
    const d = k * spacing
    const vEnv = envelope[i]
    const reachable = Math.sqrt(vEnv * vEnv + 2 * BRAKE_DECEL * d)
    cap = Math.min(cap, reachable)
  }
  if (!Number.isFinite(cap)) {
    cap = MAX_SPEED
  }

  const lateral = clamp(Math.abs(distFromCenter) / ROAD_HALF, 0, 1.2)
  cap *= 1 - LATERAL_SLOW * lateral

  if (boost > 0) {
    cap *= 1 + (BOOST_SCALE - 1) * boost
  }

  return clamp(cap, 0, MAX_SPEED * BOOST_SCALE)
}

/**
 * P-control pedals that seek the allowed speed. Off-track returns zero
 * so grass drag and stuck recovery own the crawl.
 */
export function speedControls(opts: {
  speed: number
  allowed: number
  offTrack: boolean
}): Pick<SimControls, 'throttle' | 'brake'> {
  if (opts.offTrack) {
    return { throttle: 0, brake: 0 }
  }

  const err = opts.allowed - opts.speed
  if (err > 0) {
    return {
      throttle: clamp(err / P_THROTTLE, 0, 1),
      brake: 0,
    }
  }
  return {
    throttle: 0,
    brake: clamp(-err / P_BRAKE, 0, 1),
  }
}
