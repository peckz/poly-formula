import racingLineData from '../tracks/monza.racingline.json' with { type: 'json' }
import type { TrackPath } from './trackPath'

export type LinePoint = {
  x: number
  z: number
}

export type RacingLineSample = LinePoint & {
  s: number
  offsetM: number
  onKerb?: boolean
  phase?: string
}

type RawSample = {
  s: number
  offsetM: number
  x: number
  z: number
  onKerb?: boolean
  phase?: string
}

function wrapS(value: number, length: number) {
  return ((value % length) + length) % length
}

/**
 * Sourced F1 racing line (Norris 2024 pole geometry), closed and ordered
 * by arc length. Drops a duplicate closing sample when present.
 */
export function loadSourcedRacingLine(
  lengthM = (racingLineData.samples as RawSample[]).at(-1)?.s ?? 5793.4,
): RacingLineSample[] {
  const raw = racingLineData.samples as RawSample[]
  if (raw.length < 2) {
    return []
  }

  const out: RacingLineSample[] = raw.map((sample) => ({
    s: sample.s,
    offsetM: sample.offsetM,
    x: sample.x,
    z: sample.z,
    onKerb: sample.onKerb,
    phase: sample.phase,
  }))

  // polylineStrip treats the array as a closed loop — drop the S/F twin.
  const first = out[0]
  const last = out[out.length - 1]
  if (
    Math.hypot(first.x - last.x, first.z - last.z) < 0.5 &&
    (last.s >= lengthM - 1 || Math.abs(last.s - first.s) > lengthM * 0.5)
  ) {
    out.pop()
  }
  return out
}

/**
 * Interpolate the sourced line at arc length s (wrapped).
 */
export function sampleRacingLineAt(
  line: RacingLineSample[],
  s: number,
  lengthM: number,
): LinePoint {
  const n = line.length
  if (n === 0) {
    return { x: 0, z: 0 }
  }
  if (n === 1) {
    return { x: line[0].x, z: line[0].z }
  }

  const target = wrapS(s, lengthM)
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (line[mid].s <= target) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }

  const a = line[lo]
  const b = line[(lo + 1) % n]
  let span = b.s - a.s
  let along = target - a.s
  if (span <= 0) {
    span += lengthM
    if (along < 0) {
      along += lengthM
    }
  }
  const t = span > 0.001 ? Math.min(1, Math.max(0, along / span)) : 0
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
  }
}

/**
 * Minimum-curvature racing line fallback (elastic band). Prefer
 * {@link loadSourcedRacingLine} when monza.racingline.json is present.
 */
export function computeRacingLine(
  path: TrackPath,
  maxOffset: number,
  iterations = 600,
): LinePoint[] {
  const n = path.points.length

  const normals: Array<{ x: number; z: number }> = []
  for (let i = 0; i < n; i++) {
    const prev = path.points[(i - 1 + n) % n]
    const next = path.points[(i + 1) % n]
    let dx = next.x - prev.x
    let dz = next.z - prev.z
    const len = Math.hypot(dx, dz)
    if (len > 0.001) {
      dx /= len
      dz /= len
    }
    normals.push({ x: -dz, z: dx })
  }

  const offsets = new Array<number>(n).fill(0)
  const positionAt = (i: number) => {
    const point = path.points[i]
    const normal = normals[i]
    return {
      x: point.x + normal.x * offsets[i],
      z: point.z + normal.z * offsets[i],
    }
  }

  const relax = 0.22
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) {
      const before = positionAt((i - 1 + n) % n)
      const after = positionAt((i + 1) % n)
      const midX = (before.x + after.x) / 2
      const midZ = (before.z + after.z) / 2

      const point = path.points[i]
      const normal = normals[i]
      const desired =
        (midX - point.x) * normal.x + (midZ - point.z) * normal.z

      let next = offsets[i] + relax * (desired - offsets[i])
      next = Math.min(maxOffset, Math.max(-maxOffset, next))
      offsets[i] = next
    }
  }

  const line: LinePoint[] = []
  for (let i = 0; i < n; i++) {
    line.push(positionAt(i))
  }
  return line
}

export type SpeedProfile = {
  /** Achievable speed (m/s) at each line point. */
  speeds: number[]
  /** Required deceleration (m/s^2) leaving each point; 0 when not braking. */
  decel: number[]
}

/**
 * Speed profile along the racing line: cap by lateral grip at each point,
 * then a forward pass limited by engine acceleration and a backward pass
 * limited by braking. Where the backward pass bites, the driver must brake.
 */
export function computeSpeedProfile(
  line: LinePoint[],
  latAccel: number,
  brakeDecel: number,
  engineAccel: number,
  maxSpeed: number,
): SpeedProfile {
  const n = line.length

  const ds: number[] = []
  const speeds: number[] = []
  for (let i = 0; i < n; i++) {
    const prev = line[(i - 1 + n) % n]
    const next = line[(i + 1) % n]
    ds.push(Math.hypot(next.x - line[i].x, next.z - line[i].z))

    const ax = line[i].x - prev.x
    const az = line[i].z - prev.z
    const bx = next.x - line[i].x
    const bz = next.z - line[i].z
    const la = Math.hypot(ax, az)
    const lb = Math.hypot(bx, bz)
    let curvature = 0
    if (la > 0.01 && lb > 0.01) {
      const cross = ax * bz - az * bx
      curvature = Math.abs(cross / (la * lb * ((la + lb) / 2)))
    }
    speeds.push(
      curvature > 0.0001
        ? Math.min(maxSpeed, Math.sqrt(latAccel / curvature))
        : maxSpeed,
    )
  }

  const smoothed = speeds.map((_, i) => {
    let sum = 0
    for (let k = -3; k <= 3; k++) {
      sum += speeds[(i + k + n) % n]
    }
    return sum / 7
  })
  for (let i = 0; i < n; i++) {
    speeds[i] = smoothed[i]
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let k = 0; k < n; k++) {
      const i = k % n
      const j = (i + 1) % n
      speeds[j] = Math.min(
        speeds[j],
        Math.sqrt(speeds[i] * speeds[i] + 2 * engineAccel * ds[i]),
      )
    }
    for (let k = n - 1; k >= 0; k--) {
      const i = k % n
      const j = (i + 1) % n
      speeds[i] = Math.min(
        speeds[i],
        Math.sqrt(speeds[j] * speeds[j] + 2 * brakeDecel * ds[i]),
      )
    }
  }

  const decel: number[] = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const drop = (speeds[i] * speeds[i] - speeds[j] * speeds[j]) / (2 * ds[i])
    decel.push(Math.max(0, drop))
  }

  return { speeds, decel }
}
