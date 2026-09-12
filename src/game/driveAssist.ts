import speedsData from '../tracks/monza.speeds.json' with { type: 'json' }
import { BRAKE_DECEL, MAX_SPEED } from './sim'
import type { SimControls } from './sim'
import type { TrackPath } from './trackPath'

/**
 * Kept for callers that still reason about grip; the live envelope is the
 * sourced F1 profile, not a physics solve.
 */
export const ENVELOPE_LAT_ACCEL = 26

const S_WINDOW_M = 12
/** Long enough to see the Rettifilo 346→73 stop (~129 m) in time. */
const LOOKAHEAD_M = 160
/** Match ROAD_HALF_WIDTH in trackModel (avoid a circular import). */
const ROAD_HALF = 5.5
/** Mild: a messy line costs a little speed, not a crawl. */
const LATERAL_SLOW = 0.12
/** Extra speed when spending boost on an otherwise clean envelope. */
const BOOST_SCALE = 1.1
const P_THROTTLE = 12
const P_BRAKE = 9

type SpeedSample = { s: number; speedKmh: number }

const samples = (speedsData.samples as SpeedSample[]).slice().sort(
  (a, b) => a.s - b.s,
)
const sampleLengthM =
  (speedsData.lap as { lengthM?: number } | undefined)?.lengthM ??
  samples[samples.length - 1]?.s ??
  5793.4

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function wrapS(value: number, length: number) {
  return ((value % length) + length) % length
}

function pathSpacing(path: TrackPath): number {
  return path.length / path.points.length
}

function kmhToMs(kmh: number) {
  return kmh / 3.6
}

/**
 * Interpolate the sourced F1 speed profile (km/h) at arc length s.
 * Samples wrap at the start/finish.
 */
export function sourcedSpeedKmh(s: number, length = sampleLengthM): number {
  const n = samples.length
  if (n === 0) {
    return 0
  }
  if (n === 1) {
    return samples[0].speedKmh
  }

  const target = wrapS(s, length)
  // Binary search for the last sample with sample.s <= target.
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (samples[mid].s <= target) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }

  const a = samples[lo]
  const b = samples[(lo + 1) % n]
  let span = b.s - a.s
  let along = target - a.s
  if (span <= 0) {
    // Wrap across the S/F.
    span += length
    if (along < 0) {
      along += length
    }
  }
  const t = span > 0.001 ? clamp(along / span, 0, 1) : 0
  return a.speedKmh + (b.speedKmh - a.speedKmh) * t
}

/**
 * Centerline speed envelope (m/s per path point) from the sourced F1
 * profile (Norris 2024 pole). Min-filtered so nearest-s jitter around
 * chicanes does not flicker the pedals.
 */
export function buildSpeedEnvelope(path: TrackPath): Float64Array {
  const n = path.points.length
  const raw = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    raw[i] = clamp(
      kmhToMs(sourcedSpeedKmh(path.points[i].s, path.length)),
      0,
      MAX_SPEED,
    )
  }

  const half = Math.max(1, Math.ceil(S_WINDOW_M / pathSpacing(path)))
  const filtered = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let min = Infinity
    for (let k = -half; k <= half; k++) {
      min = Math.min(min, raw[(i + k + n * 4) % n])
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
