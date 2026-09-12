import barriersData from '../tracks/monza.barriers.json' with { type: 'json' }
import {
  RETTIFILO_T1_SKIP,
  rettifiloT1CollisionSegs,
} from './rettifiloT1'
import type { TrackPath } from './trackPath'

type Vertex = { x: number; z: number }

type AlongTrack = {
  fromS: number
  toS: number
  side: 'left' | 'right'
  offsetM: number
  widthM?: number
}

type Feature = {
  id: string
  kind: string
  polyline?: Vertex[]
  alongTrack?: AlongTrack
  widthM?: number
}

/** How a barrier answers an impact. */
type Material = {
  /** Bounce retained along the wall normal (0 = dead stop into wall). */
  restitution: number
  /** Fraction of closing speed scrubbed from total speed. */
  scrub: number
  /** Extra drag while sliding along the face. */
  scrape: number
}

const HARD_METAL: Material = { restitution: 0.12, scrub: 0.55, scrape: 18 }
const SOFT_STACK: Material = { restitution: 0.02, scrub: 0.75, scrape: 28 }
const MESH_FENCE: Material = { restitution: 0.08, scrub: 0.45, scrape: 14 }

function materialFor(kind: string): Material {
  switch (kind) {
    case 'tyre-barrier':
    case 'tecpro':
      return SOFT_STACK
    case 'debris-fence':
    case 'spectator-fence':
      return MESH_FENCE
    default:
      return HARD_METAL
  }
}

/** Solid wall along a constant offset from the centreline. */
type AlongWall = {
  fromS: number
  toS: number
  /** Signed centreline offset of the barrier centre (+ = driver right). */
  offset: number
  halfWidth: number
  material: Material
}

/** World-space segment for OSM polylines. */
type SegWall = {
  ax: number
  az: number
  bx: number
  bz: number
  /** Unit normal pointing toward the track (approximate free side). */
  nx: number
  nz: number
  halfWidth: number
  material: Material
}

export type BarrierHit = {
  nx: number
  nz: number
  depth: number
  material: Material
}

const COLLIDE_KINDS = new Set([
  'guardrail',
  'concrete-wall',
  'wall',
  'tyre-barrier',
  'tecpro',
  'debris-fence',
  'spectator-fence',
])

function wrapS(value: number, length: number) {
  return ((value % length) + length) % length
}

function coversS(fromS: number, toS: number, s: number, length: number) {
  const a = wrapS(fromS, length)
  const b = wrapS(toS, length)
  const t = wrapS(s, length)
  if (a <= b) {
    return t >= a && t <= b
  }
  return t >= a || t <= b
}

function densify(line: Vertex[], stepM: number): Vertex[] {
  const out: Vertex[] = []
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]
    const b = line[i + 1]
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    const steps = Math.max(1, Math.ceil(len / stepM))
    for (let k = 0; k < steps; k++) {
      const t = k / steps
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })
    }
  }
  out.push(line[line.length - 1])
  return out
}

/**
 * Precomputed barrier collision field. Along-track walls are tested via
 * signed lateral offset at the car's s; OSM polylines are segment tests.
 */
export class BarrierField {
  private readonly along: AlongWall[] = []
  private readonly segs: SegWall[] = []
  private readonly path: TrackPath

  constructor(path: TrackPath) {
    this.path = path
    const features = barriersData.features as Feature[]

    for (const feature of features) {
      if (!COLLIDE_KINDS.has(feature.kind)) {
        continue
      }
      if (RETTIFILO_T1_SKIP.has(feature.id)) {
        continue
      }
      const material = materialFor(feature.kind)
      const width = feature.alongTrack?.widthM ?? feature.widthM ?? 0.4
      const half = Math.max(0.15, width / 2)

      if (feature.alongTrack) {
        const sign = feature.alongTrack.side === 'right' ? 1 : -1
        this.along.push({
          fromS: feature.alongTrack.fromS,
          toS: feature.alongTrack.toS,
          offset: sign * (feature.alongTrack.offsetM + half),
          halfWidth: half,
          material,
        })
      } else if (feature.polyline && feature.polyline.length >= 2) {
        const dense = densify(feature.polyline, 6)
        for (let i = 0; i < dense.length - 1; i++) {
          const a = dense[i]
          const b = dense[i + 1]
          const dx = b.x - a.x
          const dz = b.z - a.z
          const len = Math.hypot(dx, dz)
          if (len < 0.2) {
            continue
          }
          // Lateral unit; flip so it roughly points toward the track.
          let nx = -dz / len
          let nz = dx / len
          const midX = (a.x + b.x) / 2
          const midZ = (a.z + b.z) / 2
          const nearest = path.nearest(midX, midZ)
          const sample = path.sampleAt(nearest.s)
          const toTrackX = sample.x - midX
          const toTrackZ = sample.z - midZ
          if (nx * toTrackX + nz * toTrackZ < 0) {
            nx = -nx
            nz = -nz
          }
          this.segs.push({
            ax: a.x,
            az: a.z,
            bx: b.x,
            bz: b.z,
            nx,
            nz,
            halfWidth: half,
            material,
          })
        }
      }
    }

    // Hand-authored Rettifilo T1 catch furniture (escape stays open).
    for (const seg of rettifiloT1CollisionSegs(path)) {
      const dx = seg.bx - seg.ax
      const dz = seg.bz - seg.az
      const len = Math.hypot(dx, dz)
      if (len < 0.2) {
        continue
      }
      let nx = -dz / len
      let nz = dx / len
      const midX = (seg.ax + seg.bx) / 2
      const midZ = (seg.az + seg.bz) / 2
      const nearest = path.nearest(midX, midZ)
      const sample = path.sampleAt(nearest.s)
      if (nx * (sample.x - midX) + nz * (sample.z - midZ) < 0) {
        nx = -nx
        nz = -nz
      }
      this.segs.push({
        ax: seg.ax,
        az: seg.az,
        bx: seg.bx,
        bz: seg.bz,
        nx,
        nz,
        halfWidth: seg.soft ? 0.55 : 0.25,
        material: seg.soft ? SOFT_STACK : HARD_METAL,
      })
    }
  }

  /**
   * Deepest penetration of a disc at (x, z) with the given radius, or
   * null if clear. Normal points out of the barrier (push direction).
   */
  collide(x: number, z: number, radius: number): BarrierHit | null {
    const path = this.path
    const nearest = path.nearest(x, z)
    const sample = path.sampleAt(nearest.s)
    const rx = -sample.tz
    const rz = sample.tx
    const lateral = (x - sample.x) * rx + (z - sample.z) * rz

    let best: BarrierHit | null = null

    for (const wall of this.along) {
      if (!coversS(wall.fromS, wall.toS, nearest.s, path.length)) {
        continue
      }
      const delta = lateral - wall.offset
      const limit = wall.halfWidth + radius
      if (Math.abs(delta) >= limit) {
        continue
      }
      const depth = limit - Math.abs(delta)
      // Push toward free space (away from barrier centre).
      const sign = delta >= 0 ? 1 : -1
      const nx = rx * sign
      const nz = rz * sign
      if (!best || depth > best.depth) {
        best = { nx, nz, depth, material: wall.material }
      }
    }

    for (const seg of this.segs) {
      const abx = seg.bx - seg.ax
      const abz = seg.bz - seg.az
      const lenSq = abx * abx + abz * abz
      let t = 0
      if (lenSq > 0.0001) {
        t = ((x - seg.ax) * abx + (z - seg.az) * abz) / lenSq
        t = Math.min(1, Math.max(0, t))
      }
      const px = seg.ax + abx * t
      const pz = seg.az + abz * t
      const dx = x - px
      const dz = z - pz
      const dist = Math.hypot(dx, dz)
      const limit = seg.halfWidth + radius
      if (dist >= limit) {
        continue
      }
      const depth = limit - dist
      // On the centreline (dist ≈ 0) use the track-facing normal.
      let nx = dist > 1e-5 ? dx / dist : seg.nx
      let nz = dist > 1e-5 ? dz / dist : seg.nz
      if (nx * seg.nx + nz * seg.nz < 0) {
        nx = seg.nx
        nz = seg.nz
      }
      if (!best || depth > best.depth) {
        best = { nx, nz, depth, material: seg.material }
      }
    }

    return best
  }
}
