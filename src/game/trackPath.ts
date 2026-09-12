import monza from '../tracks/monza.json' with { type: 'json' }

export type PathPoint = {
  x: number
  z: number
  s: number
}

export type CornerInfo = {
  id: string
  name: string
  s: number
  turn: string
}

export type PathSample = {
  x: number
  z: number
  /** Unit tangent in racing direction. */
  tx: number
  tz: number
}

export type NearestResult = {
  /** Arc length along the lap at the closest centerline point. */
  s: number
  /** Lateral distance from the centerline. */
  distance: number
}

function wrapS(value: number, length: number) {
  return ((value % length) + length) % length
}

/**
 * Closed centerline loop from a track data file (docs/track-format.md).
 * Points are ordered in racing direction; the segment from the last point
 * back to the first closes the lap.
 */
export class TrackPath {
  readonly points: PathPoint[]
  readonly length: number
  readonly corners: CornerInfo[]
  readonly name: string
  /** Smoothed signed curvature (1/m) per point; positive = right turn. */
  readonly curvature: number[]

  constructor(
    points: PathPoint[],
    corners: CornerInfo[],
    name: string,
  ) {
    this.points = points
    this.corners = [...corners].sort((a, b) => a.s - b.s)
    this.name = name

    const last = points[points.length - 1]
    const first = points[0]
    this.length = last.s + Math.hypot(first.x - last.x, first.z - last.z)

    this.curvature = this.computeCurvature()
  }

  private segment(i: number) {
    const n = this.points.length
    const a = this.points[i % n]
    const b = this.points[(i + 1) % n]
    return { a, b, dx: b.x - a.x, dz: b.z - a.z }
  }

  private computeCurvature(): number[] {
    const n = this.points.length
    const headings: number[] = []
    for (let i = 0; i < n; i++) {
      const { dx, dz } = this.segment(i)
      headings.push(Math.atan2(dx, dz))
    }

    const raw: number[] = []
    for (let i = 0; i < n; i++) {
      let dh = headings[i] - headings[(i - 1 + n) % n]
      while (dh > Math.PI) {
        dh -= Math.PI * 2
      }
      while (dh < -Math.PI) {
        dh += Math.PI * 2
      }
      const { dx, dz } = this.segment(i)
      const len = Math.hypot(dx, dz)
      raw.push(len > 0.01 ? dh / len : 0)
    }

    // Box smooth over ~±5 points to even out chord noise.
    const smoothed: number[] = []
    const window = 5
    for (let i = 0; i < n; i++) {
      let sum = 0
      for (let k = -window; k <= window; k++) {
        sum += raw[(i + k + n) % n]
      }
      smoothed.push(sum / (window * 2 + 1))
    }
    return smoothed
  }

  /** Index of the last point with point.s <= s (wrapped). */
  indexAt(s: number): number {
    const n = this.points.length
    const target = wrapS(s, this.length)
    let lo = 0
    let hi = n - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (this.points[mid].s <= target) {
        lo = mid
      } else {
        hi = mid - 1
      }
    }
    return lo
  }

  /** Peak |curvature| within ±windowM meters of arc length s. */
  maxCurvatureNear(s: number, windowM: number): number {
    const n = this.points.length
    const center = this.indexAt(s)
    let max = 0
    for (const dir of [-1, 1]) {
      for (let step = 0; step < n; step++) {
        const i = (center + dir * step + n) % n
        const ds = Math.abs(wrapS(this.points[i].s - s + this.length / 2, this.length) - this.length / 2)
        if (ds > windowM) {
          break
        }
        max = Math.max(max, Math.abs(this.curvature[i]))
      }
    }
    return max
  }

  /** Position and tangent at arc length s (wrapped). */
  sampleAt(s: number): PathSample {
    const target = wrapS(s, this.length)
    const { a, dx, dz } = this.segment(this.indexAt(s))
    const segLen = Math.hypot(dx, dz)
    const t = segLen > 0.001 ? (target - a.s) / segLen : 0
    return {
      x: a.x + dx * t,
      z: a.z + dz * t,
      tx: segLen > 0.001 ? dx / segLen : 0,
      tz: segLen > 0.001 ? dz / segLen : -1,
    }
  }

  /**
   * Closest point on the loop to (x, z). Full scan; ~1.8k segments is
   * cheap enough to run every frame.
   */
  nearest(x: number, z: number): NearestResult {
    const n = this.points.length
    let bestDist = Infinity
    let bestS = 0

    for (let i = 0; i < n; i++) {
      const { a, dx, dz } = this.segment(i)
      const lenSq = dx * dx + dz * dz
      let t = 0
      if (lenSq > 0.0001) {
        t = ((x - a.x) * dx + (z - a.z) * dz) / lenSq
        t = Math.min(1, Math.max(0, t))
      }
      const px = a.x + dx * t
      const pz = a.z + dz * t
      const dist = Math.hypot(x - px, z - pz)
      if (dist < bestDist) {
        bestDist = dist
        bestS = a.s + Math.sqrt(lenSq) * t
      }
    }

    return { s: wrapS(bestS, this.length), distance: bestDist }
  }

  /** Next named corner after arc length s, with distance to its apex. */
  nextCorner(s: number): { corner: CornerInfo; distance: number } {
    const ahead =
      this.corners.find((corner) => corner.s > s + 10) ?? this.corners[0]
    return { corner: ahead, distance: wrapS(ahead.s - s, this.length) }
  }
}

export const monzaPath = new TrackPath(
  monza.centerline,
  monza.corners,
  monza.name,
)

export const monzaLandmarks = monza.landmarks
