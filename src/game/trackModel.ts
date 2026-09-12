import * as THREE from 'three'
import {
  BRAKE_DECEL,
  ENGINE_ACCEL,
  LAT_ACCEL,
  MAX_SPEED,
} from './brakingAid'
import type { LinePoint } from './racingLine'
import { computeRacingLine, computeSpeedProfile } from './racingLine'
import type { TrackPath } from './trackPath'
import { monzaLandmarks, monzaPath } from './trackPath'

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

function grandstand(length: number): THREE.Group {
  const group = new THREE.Group()
  const depth = 16
  const height = 14

  const seats = new THREE.Mesh(
    new THREE.BoxGeometry(length, height, depth),
    new THREE.MeshLambertMaterial({
      map: stripeTexture([0xdfe5ea, 0x64b5dd, 0x2c3e50, 0xdfe5ea], length / 5),
      flatShading: true,
    }),
  )
  seats.position.set(0, height / 2, 0)
  seats.rotation.x = -0.28
  group.add(seats)

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(length + 6, 0.8, depth + 4),
    lambert(0xcfd2d6),
  )
  roof.position.set(0, height + 2.2, -1)
  group.add(roof)

  return group
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

/** The old Sopraelevata banking crossing over the track (scenery only). */
function overpass(): THREE.Group {
  const group = new THREE.Group()

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(56, 1.6, 16),
    lambert(0x9b9b98),
  )
  deck.position.y = 8
  group.add(deck)

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(56, 1, 0.5),
      lambert(0xe8e8e4),
    )
    rail.position.set(0, 9.3, side * 7.5)
    group.add(rail)

    const abutment = new THREE.Mesh(
      new THREE.BoxGeometry(18, 8, 16),
      lambert(0x5d8f4a),
    )
    abutment.position.set(side * 33, 4, 0)
    group.add(abutment)
  }

  return group
}

function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/** Royal park forest: instanced low-poly trees kept off the asphalt. */
function forest(path: TrackPath): THREE.Group {
  const group = new THREE.Group()
  const rand = seededRandom(20260912)

  const matrices: THREE.Matrix4[] = []
  const scales: number[] = []
  const target = 340
  for (let attempt = 0; attempt < 4000 && matrices.length < target; attempt++) {
    const x = -120 + rand() * 1340
    const z = -1620 + rand() * 2510

    let minDist = Infinity
    for (let i = 0; i < path.points.length; i += 5) {
      const point = path.points[i]
      const dist = Math.hypot(x - point.x, z - point.z)
      if (dist < minDist) {
        minDist = dist
      }
    }
    if (minDist < 16 || minDist > 320) {
      continue
    }

    const scale = 1.8 + rand() * 2.2
    scales.push(scale)
    matrices.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, 0, z),
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          rand() * Math.PI,
        ),
        new THREE.Vector3(scale, scale, scale),
      ),
    )
  }

  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.15, 0.2, 1, 5).translate(0, 0.5, 0),
    lambert(0x7a5230),
    matrices.length,
  )
  const crowns = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1.1, 0).translate(0, 1.5, 0),
    lambert(0x4d8f3a),
    matrices.length,
  )
  matrices.forEach((matrix, i) => {
    trunks.setMatrixAt(i, matrix)
    crowns.setMatrixAt(i, matrix)
  })
  group.add(trunks)
  group.add(crowns)
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
  /** Line point per centerline point index (parallel to path.points). */
  points: LinePoint[]
}

const LINE_GREEN: [number, number, number] = [0.15, 0.85, 0.4]
const LINE_ORANGE: [number, number, number] = [1.0, 0.55, 0.08]
const LINE_RED: [number, number, number] = [1.0, 0.06, 0.04]

/**
 * Ghost racing line: dashed translucent trail hugging the apexes.
 * Green where you can stay on power; orange to red where the speed
 * profile demands braking (red = hardest braking).
 */
function racingLineTrail(path: TrackPath): RacingLineHandle {
  const line = computeRacingLine(path, ROAD_HALF_WIDTH - 1.6)
  const profile = computeSpeedProfile(
    line,
    LAT_ACCEL,
    BRAKE_DECEL,
    ENGINE_ACCEL,
    MAX_SPEED,
  )

  const colors: Array<[number, number, number]> = profile.decel.map((d) => {
    if (d < 3) {
      return LINE_GREEN
    }
    const t = Math.min(1, (d - 3) / (BRAKE_DECEL * 0.8 - 3))
    return [
      LINE_ORANGE[0] + (LINE_RED[0] - LINE_ORANGE[0]) * t,
      LINE_ORANGE[1] + (LINE_RED[1] - LINE_ORANGE[1]) * t,
      LINE_ORANGE[2] + (LINE_RED[2] - LINE_ORANGE[2]) * t,
    ]
  })

  // Dashes come from the geometry itself (skipped quads) — no texture,
  // no winding sensitivity, drawn after everything else.
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const mesh = polylineStrip(line, 0.55, 0.06, material, colors, 4)
  mesh.renderOrder = 2
  return { mesh, material, points: line }
}

/** White board with red band and a big distance number, like F1 markers. */
function boardTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#f2f2ee'
    ctx.fillRect(0, 0, 128, 96)
    ctx.fillStyle = '#d23a2e'
    ctx.fillRect(0, 0, 128, 20)
    ctx.fillStyle = '#111'
    ctx.font = 'bold 52px ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 64, 58)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const BOARD_DISTANCES = [50, 100, 150]
// Boards count down to roughly the braking/turn-in point, not the apex.
const BOARD_ENTRY_OFFSET = 70

function markerBoards(path: TrackPath): THREE.Group {
  const group = new THREE.Group()
  const textures = new Map(
    BOARD_DISTANCES.map((d) => [d, boardTexture(String(d))]),
  )

  for (const corner of path.corners) {
    // Boards go on the outside of the turn.
    const lateral = corner.turn === 'right' ? -9.5 : 9.5

    for (const distance of BOARD_DISTANCES) {
      const sBoard =
        ((corner.s - BOARD_ENTRY_OFFSET - distance) % path.length +
          path.length) %
        path.length

      // Skip boards that would stand in another corner.
      const inCurve = path.maxCurvatureNear(sBoard, 15) > 0.004
      const nearOtherApex = path.corners.some(
        (other) =>
          other !== corner && Math.abs(other.s - sBoard) < 60,
      )
      if (inCurve || nearOtherApex) {
        continue
      }

      const sample = path.sampleAt(sBoard)
      const rx = -sample.tz
      const rz = sample.tx

      const board = new THREE.Group()
      const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.7, 0.12),
        lambert(0x2a2a2e),
      )
      pole.position.y = 0.85
      board.add(pole)

      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 1.25),
        new THREE.MeshLambertMaterial({
          map: textures.get(distance),
          side: THREE.DoubleSide,
        }),
      )
      sign.position.y = 2.3
      board.add(sign)

      board.position.set(
        sample.x + rx * lateral,
        0,
        sample.z + rz * lateral,
      )
      // Face oncoming traffic (local +z toward -tangent).
      board.rotation.y = Math.atan2(-sample.tx, -sample.tz)
      group.add(board)
    }
  }

  return group
}

/** Places a group at arc length s, offset laterally, facing the track. */
function placeTrackside(
  path: TrackPath,
  object: THREE.Object3D,
  s: number,
  lateral: number,
) {
  const sample = path.sampleAt(s)
  const rx = -sample.tz
  const rz = sample.tx
  object.position.set(sample.x + rx * lateral, 0, sample.z + rz * lateral)
  // Face the track: local +z toward the centerline.
  const toTrack = lateral > 0 ? -1 : 1
  object.rotation.y = Math.atan2(rx * toTrack, rz * toTrack)
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
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(1500, 2700),
    new THREE.MeshLambertMaterial({ map: grassTexture }),
  )
  grass.rotation.x = -Math.PI / 2
  grass.position.set(530, -0.02, -370)
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

  // Main grandstand on the driver's left after the line; pit building right.
  const mainStand = grandstand(220)
  placeTrackside(path, mainStand, 230, -34)
  group.add(mainStand)

  const pits = new THREE.Mesh(
    new THREE.BoxGeometry(260, 9, 18),
    lambert(0xb9b4a6),
  )
  pits.position.y = 4.5
  const pitGroup = new THREE.Group()
  pitGroup.add(pits)
  placeTrackside(path, pitGroup, 5793 - 180, 26)
  group.add(pitGroup)

  // Smaller stands at the biggest braking points.
  const rettifiloStand = grandstand(110)
  placeTrackside(path, rettifiloStand, 590, 30)
  group.add(rettifiloStand)

  const parabolicaStand = grandstand(140)
  placeTrackside(path, parabolicaStand, 4900, -32)
  group.add(parabolicaStand)

  // Sourced landmark: the old banking crosses over before Ascari.
  for (const landmark of monzaLandmarks) {
    if (landmark.id !== 'oval-north-underpass') {
      continue
    }
    const bridge = overpass()
    const sample = path.sampleAt(landmark.s)
    bridge.position.set(sample.x, 0, sample.z)
    bridge.rotation.y = yawForX(-sample.tz, sample.tx)
    group.add(bridge)
  }

  const racingLine = racingLineTrail(path)
  group.add(racingLine.mesh)
  group.add(markerBoards(path))
  group.add(forest(path))

  return { group, racingLine }
}
