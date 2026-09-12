import * as THREE from 'three'
import barriersData from '../tracks/monza.barriers.json' with { type: 'json' }
import {
  RETTIFILO_T1_SKIP,
  buildRettifiloT1Layout,
  type Vertex as T1Vertex,
} from './rettifiloT1'
import type { PathSample, TrackPath } from './trackPath'

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
  heightM?: number
  widthM?: number
  rowsOfTyres?: number
}

const features = barriersData.features as Feature[]

/** Galvanised steel for Armco / catch fencing. */
const STEEL = 0xc5ccd3
const STEEL_DARK = 0x8a929a
const POST_STEEL = 0x9aa2aa

const COLORS: Record<string, number> = {
  'concrete-wall': 0xc8c4bc,
  wall: 0xb0aaa0,
  'tyre-barrier': 0x1e1e1e,
  /** Monza runoff TecPro is the bright green catch wall. */
  tecpro: 0x3ddc5a,
  'gravel-trap': 0xc4b48a,
}
const ASPHALT = 0x3a3a40
const GRAVEL = 0xc4b48a

const DEFAULT_HEIGHT: Record<string, number> = {
  guardrail: 0.8,
  'concrete-wall': 1.2,
  wall: 1.5,
  'tyre-barrier': 0.8,
  tecpro: 1.1,
  'debris-fence': 3,
  'spectator-fence': 2,
}

const lambertCache = new Map<number, THREE.MeshLambertMaterial>()
function lambert(color: number): THREE.MeshLambertMaterial {
  let mat = lambertCache.get(color)
  if (!mat) {
    mat = new THREE.MeshLambertMaterial({ color, flatShading: true })
    lambertCache.set(color, mat)
  }
  return mat
}

const metalCache = new Map<string, THREE.MeshStandardMaterial>()
function metal(
  color: number,
  opts: { roughness?: number; metalness?: number; opacity?: number } = {},
): THREE.MeshStandardMaterial {
  const opacity = opts.opacity ?? 1
  const roughness = opts.roughness ?? 0.32
  const metalness = opts.metalness ?? 0.92
  const key = `${color}:${roughness}:${metalness}:${opacity}`
  let mat = metalCache.get(key)
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      flatShading: true,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    })
    metalCache.set(key, mat)
  }
  return mat
}

function wrapS(value: number, length: number) {
  return ((value % length) + length) % length
}

function rightOf(sample: PathSample): { x: number; z: number } {
  return { x: -sample.tz, z: sample.tx }
}

function sideSign(side: 'left' | 'right') {
  return side === 'right' ? 1 : -1
}

function featureWidth(feature: Feature): number {
  return feature.alongTrack?.widthM ?? feature.widthM ?? 0.4
}

function featureHeight(feature: Feature): number {
  if (feature.heightM != null) {
    return feature.heightM
  }
  if (feature.kind === 'tyre-barrier' && feature.rowsOfTyres) {
    return 0.8 * feature.rowsOfTyres
  }
  return DEFAULT_HEIGHT[feature.kind] ?? 1
}

function sampleSpan(
  path: TrackPath,
  fromS: number,
  toS: number,
  stepM: number,
): PathSample[] {
  const length = path.length
  const start = wrapS(fromS, length)
  const dist = wrapS(toS - fromS, length)
  if (dist < 0.05) {
    return []
  }
  const steps = Math.max(1, Math.ceil(dist / stepM))
  const out: PathSample[] = []
  for (let i = 0; i <= steps; i++) {
    out.push(path.sampleAt(start + (dist * i) / steps))
  }
  return out
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

/** Frame (tangent + lateral) at each vertex of an open centreline. */
function frames(points: Vertex[]) {
  return points.map((p, i) => {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    let dx = next.x - prev.x
    let dz = next.z - prev.z
    const len = Math.hypot(dx, dz)
    if (len > 0.001) {
      dx /= len
      dz /= len
    }
    return { x: p.x, z: p.z, tx: dx, tz: dz, lx: -dz, lz: dx }
  })
}

function arcLength(points: Vertex[]): number {
  let sum = 0
  for (let i = 1; i < points.length; i++) {
    sum += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].z - points[i - 1].z,
    )
  }
  return sum
}

/**
 * Swept rectangular prism along a centreline. y0..y1 are absolute heights;
 * width is full lateral thickness.
 */
function sweepBox(
  points: Vertex[],
  y0: number,
  y1: number,
  width: number,
  material: THREE.Material,
): THREE.Mesh | null {
  if (points.length < 2 || y1 <= y0) {
    return null
  }
  const half = width / 2
  const fr = frames(points)
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i < fr.length; i++) {
    const f = fr[i]
    const base = positions.length / 3
    positions.push(
      f.x + f.lx * half,
      y0,
      f.z + f.lz * half,
      f.x - f.lx * half,
      y0,
      f.z - f.lz * half,
      f.x + f.lx * half,
      y1,
      f.z + f.lz * half,
      f.x - f.lx * half,
      y1,
      f.z - f.lz * half,
    )
    if (i > 0) {
      const a = base - 4
      const b = base
      indices.push(
        a,
        a + 1,
        b,
        a + 1,
        b + 1,
        b,
        a + 2,
        b + 2,
        a + 3,
        a + 3,
        b + 2,
        b + 3,
        a,
        b,
        a + 2,
        a + 2,
        b,
        b + 2,
        a + 1,
        a + 3,
        b + 1,
        a + 3,
        b + 3,
        b + 1,
      )
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, material)
}

/** Thin vertical panel (chain-link / debris mesh) between y0 and y1. */
function meshPanel(
  points: Vertex[],
  y0: number,
  y1: number,
  material: THREE.Material,
): THREE.Mesh | null {
  if (points.length < 2) {
    return null
  }
  const fr = frames(points)
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i < fr.length; i++) {
    const f = fr[i]
    positions.push(f.x, y0, f.z, f.x, y1, f.z)
    if (i > 0) {
      const a = (i - 1) * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  // Double-sided so the mesh reads from both sides of the track.
  const mat = (material as THREE.MeshStandardMaterial).clone()
  mat.side = THREE.DoubleSide
  return new THREE.Mesh(geometry, mat)
}

/** Steel posts every spacingM along the centreline. */
function postsAlong(
  points: Vertex[],
  height: number,
  spacingM: number,
  material: THREE.Material,
): THREE.InstancedMesh | null {
  if (points.length < 2) {
    return null
  }
  const total = arcLength(points)
  const count = Math.max(2, Math.floor(total / spacingM) + 1)
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.12, height, 0.12),
    material,
    count,
  )
  const matrix = new THREE.Matrix4()
  const fr = frames(points)
  let traveled = 0
  let seg = 0
  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1 || 1)
    while (
      seg < points.length - 2 &&
      traveled +
        Math.hypot(
          points[seg + 1].x - points[seg].x,
          points[seg + 1].z - points[seg].z,
        ) <
        target
    ) {
      traveled += Math.hypot(
        points[seg + 1].x - points[seg].x,
        points[seg + 1].z - points[seg].z,
      )
      seg++
    }
    const a = points[seg]
    const b = points[Math.min(seg + 1, points.length - 1)]
    const segLen = Math.hypot(b.x - a.x, b.z - a.z) || 1
    const t = Math.min(1, Math.max(0, (target - traveled) / segLen))
    const x = a.x + (b.x - a.x) * t
    const z = a.z + (b.z - a.z) * t
    const yaw = Math.atan2(-(fr[seg].tz), fr[seg].tx)
    matrix.compose(
      new THREE.Vector3(x, height / 2, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
      new THREE.Vector3(1, 1, 1),
    )
    mesh.setMatrixAt(i, matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

/**
 * Classic Armco: galvanised posts + two (or three) horizontal W-beam rails.
 */
function armco(points: Vertex[], height: number): THREE.Group | null {
  if (points.length < 2) {
    return null
  }
  const group = new THREE.Group()
  const railMat = metal(STEEL, { roughness: 0.28, metalness: 0.95 })
  const postMat = metal(POST_STEEL, { roughness: 0.4, metalness: 0.88 })

  const rails = height > 0.7 ? 3 : 2
  const railH = 0.14
  const railW = 0.08
  const gap = (height - railH * rails) / (rails + 1)
  for (let r = 0; r < rails; r++) {
    const y0 = gap + r * (railH + gap)
    const rail = sweepBox(points, y0, y0 + railH, railW, railMat)
    if (rail) {
      group.add(rail)
    }
  }

  const post = postsAlong(points, height, 3.2, postMat)
  if (post) {
    group.add(post)
  }
  return group
}

/**
 * Debris / spectator catch fencing: steel posts, top rail, see-through
 * mesh panel.
 */
function catchFence(
  points: Vertex[],
  height: number,
  densePosts: boolean,
): THREE.Group | null {
  if (points.length < 2) {
    return null
  }
  const group = new THREE.Group()
  const postMat = metal(POST_STEEL, { roughness: 0.38, metalness: 0.9 })
  const railMat = metal(STEEL, { roughness: 0.3, metalness: 0.94 })
  const meshMat = metal(STEEL_DARK, {
    roughness: 0.45,
    metalness: 0.85,
    opacity: 0.38,
  })

  const panel = meshPanel(points, 0.15, height - 0.08, meshMat)
  if (panel) {
    group.add(panel)
  }
  const top = sweepBox(points, height - 0.08, height, 0.06, railMat)
  if (top) {
    group.add(top)
  }
  const post = postsAlong(points, height, densePosts ? 2.8 : 4.0, postMat)
  if (post) {
    group.add(post)
  }
  return group
}

function flatOffsetRibbon(
  samples: PathSample[],
  nearOffset: number,
  farOffset: number,
  y: number,
  color: number,
): THREE.Mesh {
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    const r = rightOf(s)
    positions.push(
      s.x + r.x * nearOffset,
      y,
      s.z + r.z * nearOffset,
      s.x + r.x * farOffset,
      y,
      s.z + r.z * farOffset,
    )
    if (i > 0) {
      const a = (i - 1) * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, lambert(color))
}

function alongMidline(
  path: TrackPath,
  along: AlongTrack,
  width: number,
  stepM: number,
): Vertex[] {
  const samples = sampleSpan(path, along.fromS, along.toS, stepM)
  const sign = sideSign(along.side)
  const mid = along.offsetM + width / 2
  return samples.map((s) => {
    const r = rightOf(s)
    return {
      x: s.x + r.x * sign * mid,
      z: s.z + r.z * sign * mid,
    }
  })
}

function midlineFor(path: TrackPath, feature: Feature): Vertex[] | null {
  if (feature.alongTrack) {
    const mid = alongMidline(
      path,
      feature.alongTrack,
      featureWidth(feature),
      5,
    )
    return mid.length >= 2 ? mid : null
  }
  if (feature.polyline && feature.polyline.length >= 2) {
    return densify(feature.polyline, 4)
  }
  return null
}

function gravelFromAlong(path: TrackPath, feature: Feature): THREE.Object3D | null {
  const along = feature.alongTrack
  if (!along) {
    return null
  }
  const width = featureWidth(feature)
  const samples = sampleSpan(path, along.fromS, along.toS, 6)
  if (samples.length < 2) {
    return null
  }
  const sign = sideSign(along.side)
  return flatOffsetRibbon(
    samples,
    sign * along.offsetM,
    sign * (along.offsetM + width),
    0.03,
    COLORS['gravel-trap'],
  )
}

function solidWall(
  points: Vertex[],
  feature: Feature,
): THREE.Object3D | null {
  const height = featureHeight(feature)
  const width = Math.max(0.25, featureWidth(feature))
  return sweepBox(
    points,
    0,
    height,
    width,
    lambert(COLORS[feature.kind] ?? 0x888888),
  )
}

/** Stacked rubber tyres — dark rings, not a solid black slab. */
function tyreStack(points: Vertex[], rows: number): THREE.Group | null {
  if (points.length < 2) {
    return null
  }
  const group = new THREE.Group()
  const rubber = lambert(0x1a1a1a)
  const stripe = lambert(0x2e2e2e)
  const spacing = 1.35
  const total = arcLength(points)
  const count = Math.max(2, Math.floor(total / spacing))
  const fr = frames(points)
  let traveled = 0
  let seg = 0
  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1 || 1)
    while (
      seg < points.length - 2 &&
      traveled +
        Math.hypot(
          points[seg + 1].x - points[seg].x,
          points[seg + 1].z - points[seg].z,
        ) <
        target
    ) {
      traveled += Math.hypot(
        points[seg + 1].x - points[seg].x,
        points[seg + 1].z - points[seg].z,
      )
      seg++
    }
    const a = points[seg]
    const b = points[Math.min(seg + 1, points.length - 1)]
    const segLen = Math.hypot(b.x - a.x, b.z - a.z) || 1
    const t = Math.min(1, Math.max(0, (target - traveled) / segLen))
    const x = a.x + (b.x - a.x) * t
    const z = a.z + (b.z - a.z) * t
    const yaw = Math.atan2(-(fr[seg].tz), fr[seg].tx)
    for (let r = 0; r < rows; r++) {
      const tyre = new THREE.Mesh(
        new THREE.TorusGeometry(0.48, 0.18, 6, 10),
        r % 2 === 0 ? rubber : stripe,
      )
      tyre.position.set(x, 0.48 + r * 0.72, z)
      tyre.rotation.y = yaw
      tyre.rotation.x = Math.PI / 2
      group.add(tyre)
    }
  }
  return group
}

/** Bright green TecPro blocks along a midline. */
function tecproWall(points: Vertex[], height: number): THREE.Mesh | null {
  return sweepBox(points, 0, height, 1.0, lambert(COLORS.tecpro))
}

function flatPolygon(ring: T1Vertex[], y: number, color: number): THREE.Mesh | null {
  if (ring.length < 3) {
    return null
  }
  const shape = new THREE.Shape()
  shape.moveTo(ring[0].x, -ring[0].z)
  for (let i = 1; i < ring.length - 1; i++) {
    shape.lineTo(ring[i].x, -ring[i].z)
  }
  shape.closePath()
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, lambert(color))
  mesh.position.y = y
  return mesh
}

function ribbonFromCenter(
  center: Vertex[],
  width: number,
  y: number,
  color: number,
): THREE.Mesh | null {
  if (center.length < 2) {
    return null
  }
  const half = width / 2
  const fr = frames(center)
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i < fr.length; i++) {
    const f = fr[i]
    positions.push(
      f.x + f.lx * half,
      y,
      f.z + f.lz * half,
      f.x - f.lx * half,
      y,
      f.z - f.lz * half,
    )
    if (i > 0) {
      const a = (i - 1) * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, lambert(color))
}

/** Hand-authored Rettifilo: open escape cut, island gravel, green TecPro. */
function buildRettifiloT1(path: TrackPath): THREE.Group {
  const group = new THREE.Group()
  group.name = 'rettifilo-t1'
  const layout = buildRettifiloT1Layout(path)

  const escape = ribbonFromCenter(
    layout.escapeCenter,
    layout.escapeWidth,
    0.025,
    ASPHALT,
  )
  if (escape) {
    escape.name = 'rettifilo-escape-road'
    group.add(escape)
  }

  const island = flatPolygon(layout.island, 0.035, GRAVEL)
  if (island) {
    island.name = 'rettifilo-island-gravel'
    group.add(island)
  }

  const outside = flatPolygon(layout.outsideRight, 0.035, GRAVEL)
  if (outside) {
    outside.name = 'rettifilo-outside-gravel'
    group.add(outside)
  }

  const tecpro = tecproWall(layout.tecproRight, 1.1)
  if (tecpro) {
    tecpro.name = 'rettifilo-tecpro-right'
    group.add(tecpro)
  }

  const railR = armco(layout.railRight, 0.8)
  if (railR) {
    railR.name = 'rettifilo-rail-right'
    group.add(railR)
  }

  const railL = armco(layout.railEscapeLeft, 0.8)
  if (railL) {
    railL.name = 'rettifilo-rail-escape-left'
    group.add(railL)
  }

  const fence = catchFence(layout.fenceEscapeLeft, 3, true)
  if (fence) {
    fence.name = 'rettifilo-fence-escape-left'
    group.add(fence)
  }

  // Soft end-of-escape row (not a wall across the braking zone).
  const endCatch = tyreStack(layout.escapeEndCatch, 2)
  if (endCatch) {
    endCatch.name = 'rettifilo-escape-end-catch'
    group.add(endCatch)
  }

  return group
}

function buildFeature(
  path: TrackPath,
  feature: Feature,
): THREE.Object3D | null {
  if (RETTIFILO_T1_SKIP.has(feature.id)) {
    return null
  }

  if (feature.kind === 'gravel-trap') {
    return gravelFromAlong(path, feature)
  }

  const mid = midlineFor(path, feature)
  if (!mid) {
    return null
  }

  switch (feature.kind) {
    case 'guardrail':
      return armco(mid, featureHeight(feature))
    case 'debris-fence':
      return catchFence(mid, featureHeight(feature), true)
    case 'spectator-fence':
      return catchFence(mid, featureHeight(feature), false)
    case 'tyre-barrier':
      return tyreStack(mid, feature.rowsOfTyres ?? 3)
    case 'tecpro':
      return tecproWall(mid, featureHeight(feature))
    case 'concrete-wall':
    case 'wall':
      return solidWall(mid, feature)
    default:
      return solidWall(mid, feature)
  }
}

/**
 * Builds Monza safety furniture from monza.barriers.json: galvanised Armco,
 * steel catch fencing, concrete / TecPro / tyre walls, and gravel traps.
 * Rettifilo T1 is a special-case layout so the escape road stays open.
 */
export function buildBarriers(path: TrackPath): THREE.Group {
  const group = new THREE.Group()

  for (const feature of features) {
    const mesh = buildFeature(path, feature)
    if (mesh) {
      mesh.name = feature.id
      group.add(mesh)
    }
  }

  group.add(buildRettifiloT1(path))

  return group
}
