import * as THREE from 'three'
import { sourcedSpeedKmh } from './driveAssist'
import type { LinePoint, RacingLineSample } from './racingLine'
import { loadSourcedRacingLine, sampleRacingLineAt } from './racingLine'
import { buildBarriers } from './barriers'
import { buildScenery } from './scenery'
import type { TrackPath } from './trackPath'
import { monzaPath } from './trackPath'

export const ROAD_HALF_WIDTH = 5.5 // published width 10-12 m
export const KERB_OUTER = ROAD_HALF_WIDTH + 1.2

const GRASS = 0x6cab51
const GRASS_DARK = 0x61a047
const ASPHALT = 0x4a4a50
const KERB_RED = 0xd23a2e
const ORANGE = 0xf0922e
const YELLOW = 0xe8c93e

// Kerbs appear where the corner radius drops below ~1/threshold meters.
const KERB_CURVATURE = 1 / 120
const KERB_DILATE_POINTS = 14

function lambert(color: number) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true })
}

/** 1D palette texture; each color becomes one texel repeated along U. */
function stripeTexture(colors: number[], repeats: number): THREE.DataTexture {
  const data = new Uint8Array(colors.length * 4)
  colors.forEach((hex, i) => {
    data[i * 4] = (hex >> 16) & 0xff
    data[i * 4 + 1] = (hex >> 8) & 0xff
    data[i * 4 + 2] = hex & 0xff
    data[i * 4 + 3] = 255
  })
  const texture = new THREE.DataTexture(data, colors.length, 1)
  texture.needsUpdate = true
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.repeat.set(repeats, 1)
  return texture
}

function checkerTexture(repeatsX: number, repeatsY: number): THREE.DataTexture {
  const data = new Uint8Array([
    30, 30, 30, 255, 240, 240, 240, 255, 240, 240, 240, 255, 30, 30, 30, 255,
  ])
  const texture = new THREE.DataTexture(data, 2, 2)
  texture.needsUpdate = true
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.repeat.set(repeatsX, repeatsY)
  return texture
}

/** Driver-right unit normal at point i (average of adjacent tangents). */
function rightNormal(path: TrackPath, i: number): { x: number; z: number } {
  const n = path.points.length
  const prev = path.points[(i - 1 + n) % n]
  const next = path.points[(i + 1) % n]
  let dx = next.x - prev.x
  let dz = next.z - prev.z
  const len = Math.hypot(dx, dz)
  if (len > 0.001) {
    dx /= len
    dz /= len
  }
  return { x: -dz, z: dx }
}

/**
 * Triangle strip along the centerline between lateral offsets
 * [inner, outer] (meters, positive = driver right). `runs` are point index
 * ranges [from, to] inclusive; null means the full closed loop.
 * UV u is arc length in meters.
 */
function ribbon(
  path: TrackPath,
  inner: number,
  outer: number,
  y: number,
  runs: Array<[number, number]> | null,
  material: THREE.Material,
): THREE.Mesh {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const n = path.points.length

  const addRun = (from: number, to: number, wrap: boolean) => {
    const base = positions.length / 3
    const count = to - from + (wrap ? 2 : 1)
    for (let k = 0; k < count; k++) {
      const idx = (from + k) % n
      const point = path.points[idx]
      const normal = rightNormal(path, idx)
      const u = from + k >= n ? path.length : point.s
      positions.push(
        point.x + normal.x * inner,
        y,
        point.z + normal.z * inner,
        point.x + normal.x * outer,
        y,
        point.z + normal.z * outer,
      )
      uvs.push(u, 0, u, 1)
      if (k > 0) {
        const a = base + (k - 1) * 2
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
  }

  if (runs === null) {
    addRun(0, n - 1, true)
  } else {
    for (const [from, to] of runs) {
      addRun(from, to, false)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, material)
}

/** Point index ranges where the track is curved enough to deserve kerbs. */
function kerbRuns(path: TrackPath): Array<[number, number]> {
  const n = path.points.length
  const marked = new Array<boolean>(n).fill(false)
  for (let i = 0; i < n; i++) {
    if (Math.abs(path.curvature[i]) > KERB_CURVATURE) {
      for (let k = -KERB_DILATE_POINTS; k <= KERB_DILATE_POINTS; k++) {
        marked[(i + k + n) % n] = true
      }
    }
  }

  const runs: Array<[number, number]> = []
  let start = -1
  for (let i = 0; i < n; i++) {
    if (marked[i] && start === -1) {
      start = i
    }
    if (!marked[i] && start !== -1) {
      runs.push([start, i - 1])
      start = -1
    }
  }
  if (start !== -1) {
    runs.push([start, n - 1])
  }
  return runs
}

/** Yaw that maps the local +x axis onto world direction (dx, dz). */
function yawForX(dx: number, dz: number) {
  return Math.atan2(-dz, dx)
}

function gantry(): THREE.Group {
  const group = new THREE.Group()
  const span = KERB_OUTER * 2 + 6

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 7, 1.4),
      lambert(ORANGE),
    )
    leg.position.set(side * (span / 2), 3.5, 0)
    group.add(leg)

    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1, 2.4),
      lambert(YELLOW),
    )
    foot.position.set(side * (span / 2), 0.5, 0)
    group.add(foot)
  }

  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(span + 1.4, 1.6, 1.8),
    lambert(ORANGE),
  )
  beam.position.set(0, 7.3, 0)
  group.add(beam)

  return group
}

/**
 * Flat strip along an arbitrary closed polyline; u = arc length.
 * `colors` is one RGB triple per point, baked as vertex colors.
 */
function polylineStrip(
  points: LinePoint[],
  width: number,
  y: number,
  material: THREE.Material,
  colors?: Array<[number, number, number]>,
  /** If set, only draw quads in alternating dashM-long chunks. */
  dashM?: number,
): THREE.Mesh {
  const n = points.length
  const positions: number[] = []
  const uvs: number[] = []
  const vertexColors: number[] = []
  const indices: number[] = []
  const half = width / 2

  let arc = 0
  for (let k = 0; k <= n; k++) {
    const i = k % n
    const prev = points[(i - 1 + n) % n]
    const next = points[(i + 1) % n]
    let dx = next.x - prev.x
    let dz = next.z - prev.z
    const len = Math.hypot(dx, dz)
    if (len > 0.001) {
      dx /= len
      dz /= len
    }

    if (k > 0) {
      const before = points[(k - 1) % n]
      arc += Math.hypot(points[i].x - before.x, points[i].z - before.z)
    }

    // Left vertex first, matching ribbon() winding so faces point up.
    positions.push(
      points[i].x + dz * half,
      y,
      points[i].z - dx * half,
      points[i].x - dz * half,
      y,
      points[i].z + dx * half,
    )
    uvs.push(arc, 0, arc, 1)
    if (colors) {
      const [r, g, b] = colors[i]
      vertexColors.push(r, g, b, r, g, b)
    }
    const inGap = dashM !== undefined && Math.floor(arc / dashM) % 2 === 1
    if (k > 0 && !inGap) {
      const a = (k - 1) * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  if (colors) {
    geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(vertexColors, 3),
    )
  }
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, material)
}

export type RacingLineHandle = {
  mesh: THREE.Mesh
  material: THREE.MeshBasicMaterial
  /** Dense sourced line samples (for draw / debug). */
  points: RacingLineSample[]
  /** World position of the racing line at arc length s. */
  sampleAt: (s: number) => LinePoint
}

const LINE_GREEN: [number, number, number] = [0.15, 0.85, 0.4]
const LINE_BRAKE: [number, number, number] = [1.0, 0.25, 0.05]

// Braking-zone segmentation: decel above the threshold marks a point,
// then small gaps are bridged and tiny blips dropped so zones read as
// one solid stretch instead of flickering red/green.
const BRAKE_DECEL_THRESHOLD = 6
const BRAKE_GAP_POINTS = 22 // ~70 m at current point spacing
const BRAKE_MIN_POINTS = 12 // ~40 m

/** Solid true-runs after closing short gaps and removing short runs. */
function brakingZoneMask(decel: number[]): boolean[] {
  const n = decel.length
  const mask = decel.map((d) => d > BRAKE_DECEL_THRESHOLD)

  // Close gaps shorter than BRAKE_GAP_POINTS (circular).
  for (let i = 0; i < n; i++) {
    if (mask[i]) {
      continue
    }
    let gap = 0
    while (gap < BRAKE_GAP_POINTS && !mask[(i + gap) % n]) {
      gap++
    }
    if (gap < BRAKE_GAP_POINTS && mask[(i - 1 + n) % n]) {
      for (let k = 0; k < gap; k++) {
        mask[(i + k) % n] = true
      }
    }
  }

  // Drop isolated runs shorter than BRAKE_MIN_POINTS.
  for (let i = 0; i < n; i++) {
    if (!mask[i] || mask[(i - 1 + n) % n]) {
      continue
    }
    let run = 0
    while (run < n && mask[(i + run) % n]) {
      run++
    }
    if (run < BRAKE_MIN_POINTS) {
      for (let k = 0; k < run; k++) {
        mask[(i + k) % n] = false
      }
    }
  }

  return mask
}

/**
 * Ghost racing line from the sourced F1 file. Green on power; solid
 * orange-red across braking zones from the sourced speed profile.
 */
function racingLineTrail(path: TrackPath): RacingLineHandle {
  const samples = loadSourcedRacingLine(path.length)
  const line: LinePoint[] = samples.map((p) => ({ x: p.x, z: p.z }))

  // Sourced centreline speed (m/s) at each racing-line sample's s.
  const speeds = samples.map((p) => sourcedSpeedKmh(p.s, path.length) / 3.6)

  const decel: number[] = []
  for (let i = 0; i < line.length; i++) {
    const a = line[i]
    const b = line[(i + 1) % line.length]
    const ds = Math.hypot(b.x - a.x, b.z - a.z)
    const dv = speeds[(i + 1) % line.length] - speeds[i]
    decel.push(ds > 0.05 ? Math.max(0, -dv / ds) * speeds[i] : 0)
  }

  const zones = brakingZoneMask(decel)
  const colors: Array<[number, number, number]> = zones.map((braking) =>
    braking ? LINE_BRAKE : LINE_GREEN,
  )

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const mesh = polylineStrip(line, 0.55, 0.06, material, colors, 4)
  mesh.renderOrder = 2
  return {
    mesh,
    material,
    points: samples,
    sampleAt: (s) => sampleRacingLineAt(samples, s, path.length),
  }
}

export type BuiltTrack = {
  group: THREE.Group
  racingLine: RacingLineHandle
}

export function buildTrack(): BuiltTrack {
  const path = monzaPath
  const group = new THREE.Group()

  const grassTexture = stripeTexture([GRASS, GRASS_DARK], 1)
  grassTexture.repeat.set(1, 120)
  grassTexture.rotation = Math.PI / 2
  // Wide enough to sit under every sourced scenery footprint.
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 3200),
    new THREE.MeshLambertMaterial({ map: grassTexture }),
  )
  grass.rotation.x = -Math.PI / 2
  grass.position.set(600, -0.02, -300)
  group.add(grass)

  group.add(
    ribbon(
      path,
      -ROAD_HALF_WIDTH,
      ROAD_HALF_WIDTH,
      0,
      null,
      lambert(ASPHALT),
    ),
  )

  const kerbMaterial = new THREE.MeshLambertMaterial({
    map: stripeTexture([KERB_RED, 0xf0f0ec], 1 / 8),
  })
  const runs = kerbRuns(path)
  group.add(ribbon(path, -KERB_OUTER, -ROAD_HALF_WIDTH, 0.04, runs, kerbMaterial))
  group.add(ribbon(path, ROAD_HALF_WIDTH, KERB_OUTER, 0.04, runs, kerbMaterial))

  // Start/finish line.
  const start = path.sampleAt(0)
  const startLine = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, 1.6),
    new THREE.MeshLambertMaterial({ map: checkerTexture(9, 2) }),
  )
  startLine.geometry.rotateX(-Math.PI / 2)
  startLine.position.set(start.x, 0.01, start.z)
  startLine.rotation.y = yawForX(-start.tz, start.tx)
  group.add(startLine)

  const gate = gantry()
  gate.position.set(start.x, 0, start.z)
  gate.rotation.y = yawForX(-start.tz, start.tx)
  group.add(gate)

  // Sourced surroundings (OSM footprints): stands, pits, banking, forest.
  group.add(buildScenery(path))
  // Safety furniture: Armco, walls, TecPro, tyres, fences, gravel.
  group.add(buildBarriers(path))

  const racingLine = racingLineTrail(path)
  group.add(racingLine.mesh)

  return { group, racingLine }
}
