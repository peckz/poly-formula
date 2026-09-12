import type { TrackPath } from './trackPath'

export type Vertex = { x: number; z: number }

/**
 * Barrier ids whose alongTrack envelopes follow the chicane centreline and
 * incorrectly paint walls / gravel across the straight escape road. Replaced
 * by {@link buildRettifiloT1Layout}.
 */
export const RETTIFILO_T1_SKIP = new Set([
  'gravel-trap-rettifilo-t1-outside-right',
  'gravel-trap-rettifilo-t1-t2-left',
  'gravel-trap-rettifilo-cut-strip-right',
  'tyre-barrier-rettifilo-t1-right',
  'tyre-barrier-rettifilo-t2-left',
  'guardrail-left-t1-behind-gravel',
  'guardrail-right-t1-behind',
  'debris-fence-rettifilo-esterna-left',
])

export type RettifiloT1Layout = {
  /** Asphalt escape / cut continuing straight past the chicane. */
  escapeCenter: Vertex[]
  escapeWidth: number
  /** Triangular gravel island between chicane and escape road. */
  island: Vertex[]
  /** Outside-right gravel bed at T1. */
  outsideRight: Vertex[]
  /** Green TecPro at the back of the outside runoff. */
  tecproRight: Vertex[]
  /** Armco behind the outside runoff. */
  railRight: Vertex[]
  /** Left-side rail along the escape / park, not across the cut. */
  railEscapeLeft: Vertex[]
  /** Debris fence in front of Prima Variante Esterna (left of escape). */
  fenceEscapeLeft: Vertex[]
  /** Soft catch at the far end of the escape before rejoining. */
  escapeEndCatch: Vertex[]
}

function lerp(a: Vertex, b: Vertex, t: number): Vertex {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
}

/**
 * Realistic Variante del Rettifilo layout: chicane on the racing line,
 * straight asphalt escape if you miss the braking zone, gravel island
 * between them, green TecPro on the outside-right runoff only.
 */
export function buildRettifiloT1Layout(path: TrackPath): RettifiloT1Layout {
  // Approach still straight; escape continues this heading while the GP
  // ribbon turns right into T1.
  const entry = path.sampleAt(565)
  const tx = entry.tx
  const tz = entry.tz
  const rx = -tz
  const rz = tx

  const escapeCenter: Vertex[] = []
  const straightM = 130
  for (let d = 0; d <= straightM; d += 6) {
    escapeCenter.push({
      x: entry.x + tx * d,
      z: entry.z + tz * d,
    })
  }
  // Soft left bend to rejoin after T2 (~s 740).
  const rejoin = path.sampleAt(742)
  const last = escapeCenter[escapeCenter.length - 1]
  for (let i = 1; i <= 5; i++) {
    const t = i / 5
    const target = {
      x: rejoin.x - rx * 5,
      z: rejoin.z - rz * 5,
    }
    escapeCenter.push(lerp(last, target, t * t * (3 - 2 * t)))
  }

  const escapeWidth = 10

  // Island: escape right edge ↔ chicane left kerb through the right-hander.
  const island: Vertex[] = []
  const escRight = escapeCenter.map((p) => ({
    x: p.x + rx * (escapeWidth / 2),
    z: p.z + rz * (escapeWidth / 2),
  }))
  // Walk chicane left edge s=600→720 (driver-left of GP ribbon).
  const chicaneLeft: Vertex[] = []
  for (let s = 600; s <= 720; s += 8) {
    const sample = path.sampleAt(s)
    const crx = -sample.tz
    const crz = sample.tx
    chicaneLeft.push({
      x: sample.x - crx * 6.5,
      z: sample.z - crz * 6.5,
    })
  }
  // Ring: along escape right (entry→exit), then back along chicane left.
  for (const p of escRight.slice(0, 16)) {
    island.push(p)
  }
  for (let i = chicaneLeft.length - 1; i >= 0; i--) {
    island.push(chicaneLeft[i])
  }
  if (island.length > 0) {
    island.push(island[0])
  }

  // Outside-right gravel: driver-right of T1 apex runoff.
  const outsideRight: Vertex[] = []
  const outerNear: Vertex[] = []
  const outerFar: Vertex[] = []
  for (let s = 585; s <= 680; s += 6) {
    const sample = path.sampleAt(s)
    const crx = -sample.tz
    const crz = sample.tx
    outerNear.push({
      x: sample.x + crx * 7.2,
      z: sample.z + crz * 7.2,
    })
    outerFar.push({
      x: sample.x + crx * 28,
      z: sample.z + crz * 28,
    })
  }
  for (const p of outerNear) {
    outsideRight.push(p)
  }
  for (let i = outerFar.length - 1; i >= 0; i--) {
    outsideRight.push(outerFar[i])
  }
  if (outsideRight.length > 0) {
    outsideRight.push(outsideRight[0])
  }

  // TecPro / green catch at the back of the outside bed (not across escape).
  const tecproRight: Vertex[] = []
  for (let s = 600; s <= 670; s += 5) {
    const sample = path.sampleAt(s)
    const crx = -sample.tz
    const crz = sample.tx
    tecproRight.push({
      x: sample.x + crx * 29,
      z: sample.z + crz * 29,
    })
  }

  const railRight = tecproRight.map((p) => {
    const sample = path.sampleAt(path.nearest(p.x, p.z).s)
    const crx = -sample.tz
    const crz = sample.tx
    return { x: p.x + crx * 2.2, z: p.z + crz * 2.2 }
  })

  // Left protection follows the escape, leaving the cut open.
  const railEscapeLeft = escapeCenter.map((p) => ({
    x: p.x - rx * (escapeWidth / 2 + 5.5),
    z: p.z - rz * (escapeWidth / 2 + 5.5),
  }))
  const fenceEscapeLeft = railEscapeLeft.map((p) => ({
    x: p.x - rx * 1.2,
    z: p.z - rz * 1.2,
  }))

  // Soft end-of-escape catch sits across the far mouth only (not the
  // driving line for most of the cut) — a short tyre row left of rejoin.
  const end = escapeCenter[escapeCenter.length - 2]
  const escapeEndCatch: Vertex[] = [
    { x: end.x - rx * 8, z: end.z - rz * 8 },
    { x: end.x - rx * 2.5, z: end.z - rz * 2.5 },
  ]

  return {
    escapeCenter,
    escapeWidth,
    island,
    outsideRight,
    tecproRight,
    railRight,
    railEscapeLeft,
    fenceEscapeLeft,
    escapeEndCatch,
  }
}

/** Collision segments derived from the T1 override (soft + hard). */
export function rettifiloT1CollisionSegs(path: TrackPath): Array<{
  ax: number
  az: number
  bx: number
  bz: number
  soft: boolean
}> {
  const layout = buildRettifiloT1Layout(path)
  const segs: Array<{
    ax: number
    az: number
    bx: number
    bz: number
    soft: boolean
  }> = []

  const addChain = (points: Vertex[], soft: boolean) => {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]
      const b = points[i + 1]
      if (Math.hypot(b.x - a.x, b.z - a.z) < 0.3) {
        continue
      }
      segs.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, soft })
    }
  }

  addChain(layout.tecproRight, true)
  addChain(layout.railRight, false)
  addChain(layout.railEscapeLeft, false)
  addChain(layout.fenceEscapeLeft, false)
  addChain(layout.escapeEndCatch, true)
  return segs
}
