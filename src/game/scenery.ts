import * as THREE from 'three'
import sceneryData from '../tracks/monza.scenery.json' with { type: 'json' }
import type { TrackPath } from './trackPath'

type Vertex = { x: number; z: number }

type Feature = {
  id: string
  kind: string
  polygon?: Vertex[]
  polyline?: Vertex[]
  heightM?: number
  widthM?: number
  colorHint?: string
}

const features = sceneryData.features as Feature[]

const DEFAULTS: Record<string, { color: number; height: number }> = {
  grandstand: { color: 0xc9d4dc, height: 12 },
  'pit-building': { color: 0xb8b0a4, height: 8 },
  building: { color: 0xc4b8a8, height: 10 },
  bridge: { color: 0x8a8680, height: 0 },
  parking: { color: 0x6b6e72, height: 0 },
  'service-road': { color: 0x7a7a7a, height: 0 },
  water: { color: 0x4a7a8a, height: 0 },
  helipad: { color: 0x8a8a86, height: 0 },
  gate: { color: 0x5a534c, height: 0 },
  other: { color: 0x8a8070, height: 0 },
  banking: { color: 0xa8a49a, height: 0 },
  hedge: { color: 0x4a6a3c, height: 0 },
  treeline: { color: 0x3a5a38, height: 0 },
  forest: { color: 0x4d8f3a, height: 0 },
}

const materialCache = new Map<number, THREE.MeshLambertMaterial>()
function lambert(color: number): THREE.MeshLambertMaterial {
  let material = materialCache.get(color)
  if (!material) {
    material = new THREE.MeshLambertMaterial({ color, flatShading: true })
    materialCache.set(color, material)
  }
  return material
}

function featureColor(feature: Feature): number {
  if (feature.colorHint) {
    return Number.parseInt(feature.colorHint.slice(1), 16)
  }
  return DEFAULTS[feature.kind]?.color ?? 0x999999
}

/**
 * Shape in the XZ ground plane. Shape space (x, y) maps to world (x, z)
 * via rotateX(-PI/2): (x, y, zExtrude) -> (x, zExtrude, -y), so shape
 * y = -world z and extrusion depth goes up (+y).
 */
function groundShape(ring: Vertex[]): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(ring[0].x, -ring[0].z)
  // Ring is closed (last === first); skip the duplicate.
  for (let i = 1; i < ring.length - 1; i++) {
    shape.lineTo(ring[i].x, -ring[i].z)
  }
  shape.closePath()
  return shape
}

function extrudedPolygon(
  ring: Vertex[],
  height: number,
  color: number,
): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(groundShape(ring), {
    depth: height,
    bevelEnabled: false,
  })
  geometry.rotateX(-Math.PI / 2)
  return new THREE.Mesh(geometry, lambert(color))
}

function flatPolygon(ring: Vertex[], y: number, color: number): THREE.Mesh {
  const geometry = new THREE.ShapeGeometry(groundShape(ring))
  geometry.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, lambert(color))
  mesh.position.y = y
  return mesh
}

/** Flat ribbon centred on an open polyline; per-point y allowed. */
function ribbonAlong(
  points: Array<{ x: number; z: number; y: number }>,
  width: number,
  material: THREE.Material,
): THREE.Mesh {
  const positions: number[] = []
  const indices: number[] = []
  const half = width / 2
  const n = points.length

  for (let i = 0; i < n; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(n - 1, i + 1)]
    let dx = next.x - prev.x
    let dz = next.z - prev.z
    const len = Math.hypot(dx, dz)
    if (len > 0.001) {
      dx /= len
      dz /= len
    }
    positions.push(
      points[i].x + dz * half,
      points[i].y,
      points[i].z - dx * half,
      points[i].x - dz * half,
      points[i].y,
      points[i].z + dx * half,
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
  return new THREE.Mesh(geometry, material)
}

/** Densify an open polyline to roughly stepM spacing. */
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

function pointInPolygon(x: number, z: number, ring: Vertex[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]
    const b = ring[j]
    if (
      a.z > z !== b.z > z &&
      x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x
    ) {
      inside = !inside
    }
  }
  return inside
}

function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/**
 * The old Sopraelevata banking: a 12 m concrete ribbon. Where it crosses
 * the GP track (the north underpass) the deck ramps up to bridge height
 * so it passes over the racing surface.
 */
function banking(feature: Feature, path: TrackPath): THREE.Group {
  const group = new THREE.Group()
  if (!feature.polyline) {
    return group
  }

  const dense = densify(feature.polyline, 8)
  const deckHeight = 8
  const rampM = 90

  const points = dense.map((p) => {
    const dist = path.nearest(p.x, p.z).distance
    // Lift smoothly while the ribbon is near the GP centerline.
    const t = Math.max(0, Math.min(1, (rampM - dist) / (rampM - 12)))
    return { x: p.x, z: p.z, y: 0.05 + deckHeight * t * t * (3 - 2 * t) }
  })

  const width = feature.widthM ?? 12
  const material = lambert(featureColor(feature))
  const deck = ribbonAlong(points, width, material)
  group.add(deck)

  // Support piers under the raised part, kept off the racing surface.
  for (const point of points) {
    if (point.y > 1.5 && path.nearest(point.x, point.z).distance > 12) {
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, point.y, 1.2),
        lambert(0x8f8b82),
      )
      pier.position.set(point.x, point.y / 2, point.z)
      group.add(pier)
    }
  }

  return group
}

/** Footbridge: deck ribbon at height with a leg at each end. */
function footbridge(feature: Feature): THREE.Group {
  const group = new THREE.Group()
  if (!feature.polyline || feature.polyline.length < 2) {
    return group
  }
  const deckY = 6
  const color = featureColor(feature)
  const width = feature.widthM ?? 4

  const dense = densify(feature.polyline, 6)
  const deck = ribbonAlong(
    dense.map((p) => ({ x: p.x, z: p.z, y: deckY })),
    width,
    lambert(color),
  )
  group.add(deck)

  for (const end of [
    feature.polyline[0],
    feature.polyline[feature.polyline.length - 1],
  ]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(1, deckY, 1),
      lambert(color),
    )
    leg.position.set(end.x, deckY / 2, end.z)
    group.add(leg)
  }
  return group
}

/** Hedge: one solid box per polyline segment. */
function hedgeBoxes(feature: Feature): THREE.Group {
  const group = new THREE.Group()
  if (!feature.polyline) {
    return group
  }
  const height = 1.8
  const width = feature.widthM ?? 1.5
  const material = lambert(featureColor(feature))
  for (let i = 0; i < feature.polyline.length - 1; i++) {
    const a = feature.polyline[i]
    const b = feature.polyline[i + 1]
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(len, height, width),
      material,
    )
    box.position.set((a.x + b.x) / 2, height / 2, (a.z + b.z) / 2)
    box.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x)
    group.add(box)
  }
  return group
}

type TreeSpot = { x: number; z: number; scale: number }

/** Sample tree positions inside every forest polygon. */
function forestSpots(rand: () => number): TreeSpot[] {
  const spots: TreeSpot[] = []
  for (const feature of features) {
    if (feature.kind !== 'forest' || !feature.polygon) {
      continue
    }
    const ring = feature.polygon
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const v of ring) {
      minX = Math.min(minX, v.x)
      maxX = Math.max(maxX, v.x)
      minZ = Math.min(minZ, v.z)
      maxZ = Math.max(maxZ, v.z)
    }
    // Tree density scales with footprint area, capped per polygon.
    const area = (maxX - minX) * (maxZ - minZ)
    const target = Math.min(160, Math.max(10, Math.round(area / 9000)))
    let placed = 0
    for (let attempt = 0; attempt < target * 12 && placed < target; attempt++) {
      const x = minX + rand() * (maxX - minX)
      const z = minZ + rand() * (maxZ - minZ)
      if (!pointInPolygon(x, z, ring)) {
        continue
      }
      spots.push({ x, z, scale: 2.2 + rand() * 2.6 })
      placed++
    }
  }
  return spots
}

/** Trees in a row along treeline polylines. */
function treelineSpots(rand: () => number): TreeSpot[] {
  const spots: TreeSpot[] = []
  for (const feature of features) {
    if (feature.kind !== 'treeline' || !feature.polyline) {
      continue
    }
    for (const p of densify(feature.polyline, 9)) {
      spots.push({
        x: p.x + (rand() - 0.5) * 2,
        z: p.z + (rand() - 0.5) * 2,
        scale: 2 + rand() * 1.6,
      })
    }
  }
  return spots
}

function instancedTrees(spots: TreeSpot[]): THREE.Group {
  const group = new THREE.Group()
  const rand = seededRandom(19220903)

  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.15, 0.2, 1, 5).translate(0, 0.5, 0),
    lambert(0x7a5230),
    spots.length,
  )
  const crowns = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1.1, 0).translate(0, 1.5, 0),
    lambert(0x4d8f3a),
    spots.length,
  )
  const matrix = new THREE.Matrix4()
  spots.forEach((spot, i) => {
    matrix.compose(
      new THREE.Vector3(spot.x, 0, spot.z),
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        rand() * Math.PI,
      ),
      new THREE.Vector3(spot.scale, spot.scale, spot.scale),
    )
    trunks.setMatrixAt(i, matrix)
    crowns.setMatrixAt(i, matrix)
  })
  group.add(trunks)
  group.add(crowns)
  return group
}

/** Flat ground kinds and their y offset (staggered to avoid z-fighting). */
const FLAT_Y: Record<string, number> = {
  parking: 0.012,
  'service-road': 0.012,
  helipad: 0.024,
  water: 0.018,
  other: 0.008,
}

/**
 * Builds every sourced Monza surrounding from monza.scenery.json:
 * extruded OSM footprints for stands and buildings, flat aprons,
 * the banked oval ribbon, footbridges, hedges, and the park forest.
 */
export function buildScenery(path: TrackPath): THREE.Group {
  const group = new THREE.Group()
  const rand = seededRandom(20260912)

  for (const feature of features) {
    const color = featureColor(feature)

    switch (feature.kind) {
      case 'grandstand':
      case 'pit-building':
      case 'building': {
        if (feature.polygon) {
          const height =
            feature.heightM ?? DEFAULTS[feature.kind]?.height ?? 8
          group.add(extrudedPolygon(feature.polygon, height, color))
        }
        break
      }
      case 'gate': {
        // 2 m OSM marker square: render as a small pillar.
        if (feature.polygon) {
          const cx =
            feature.polygon.reduce((sum, v) => sum + v.x, 0) /
            feature.polygon.length
          const cz =
            feature.polygon.reduce((sum, v) => sum + v.z, 0) /
            feature.polygon.length
          const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 3, 1.4),
            lambert(color),
          )
          pillar.position.set(cx, 1.5, cz)
          group.add(pillar)
        }
        break
      }
      case 'parking':
      case 'helipad':
      case 'water':
      case 'other': {
        if (feature.polygon) {
          group.add(
            flatPolygon(feature.polygon, FLAT_Y[feature.kind] ?? 0.01, color),
          )
        }
        break
      }
      case 'service-road': {
        if (feature.polyline) {
          const dense = densify(feature.polyline, 8)
          group.add(
            ribbonAlong(
              dense.map((p) => ({ x: p.x, z: p.z, y: FLAT_Y[feature.kind] })),
              feature.widthM ?? 6,
              lambert(color),
            ),
          )
        }
        break
      }
      case 'bridge': {
        group.add(footbridge(feature))
        break
      }
      case 'banking': {
        group.add(banking(feature, path))
        break
      }
      case 'hedge': {
        group.add(hedgeBoxes(feature))
        break
      }
      // forest / treeline handled below as shared instanced meshes
    }
  }

  group.add(instancedTrees([...forestSpots(rand), ...treelineSpots(rand)]))

  return group
}
