import * as THREE from 'three'
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

export function buildTrack(): THREE.Group {
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

  group.add(forest(path))

  return group
}
