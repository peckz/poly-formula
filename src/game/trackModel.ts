import * as THREE from 'three'

export const TRACK_LENGTH = 1000
export const TRACK_HALF = TRACK_LENGTH / 2
export const ROAD_HALF_WIDTH = 7
export const KERB_OUTER = ROAD_HALF_WIDTH + 1.2

const GRASS = 0x6cab51
const GRASS_DARK = 0x61a047
const ASPHALT = 0x4a4a50
const KERB_RED = 0xd23a2e
const ORANGE = 0xf0922e
const YELLOW = 0xe8c93e

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

function tree(scale: number): THREE.Group {
  const group = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, scale, 5),
    lambert(0x7a5230),
  )
  trunk.position.y = scale / 2
  group.add(trunk)

  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1 * scale, 0),
    lambert(0x4d8f3a),
  )
  crown.position.y = scale * 1.5
  group.add(crown)
  return group
}

function grandstand(): THREE.Group {
  const group = new THREE.Group()
  const length = 180
  const depth = 16
  const height = 14

  // Sloped seating face with fan-color stripes, like Monza's main stand.
  const seats = new THREE.Mesh(
    new THREE.BoxGeometry(length, height, depth),
    new THREE.MeshLambertMaterial({
      map: stripeTexture([0xdfe5ea, 0x64b5dd, 0x2c3e50, 0xdfe5ea], 36),
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

  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(1, height + 2, 1),
      lambert(0x8d949c),
    )
    pillar.position.set(side * (length / 2 - 4), (height + 2) / 2, depth / 2)
    group.add(pillar)
  }

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

function hill(radius: number, height: number, color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 6), lambert(color))
  mesh.position.y = height / 2 - 1
  return mesh
}

/**
 * Monza main straight, running along the z axis from -TRACK_HALF to
 * +TRACK_HALF. Start/finish gantry sits at z = 0; driving direction is -z.
 */
export function buildTrack(): THREE.Group {
  const group = new THREE.Group()

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(700, TRACK_LENGTH + 600),
    new THREE.MeshLambertMaterial({
      map: (() => {
        const texture = stripeTexture([GRASS, GRASS_DARK], 1)
        texture.repeat.set(1, 55)
        texture.rotation = Math.PI / 2
        return texture
      })(),
    }),
  )
  grass.rotation.x = -Math.PI / 2
  grass.position.y = -0.02
  group.add(grass)

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, TRACK_LENGTH + 200),
    lambert(ASPHALT),
  )
  road.rotation.x = -Math.PI / 2
  group.add(road)

  // Kerbs: long boxes rotated so the striped U axis runs down the track.
  for (const side of [-1, 1]) {
    const kerb = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_LENGTH + 200, 0.1, KERB_OUTER - ROAD_HALF_WIDTH),
      new THREE.MeshLambertMaterial({
        map: stripeTexture([KERB_RED, 0xf0f0ec], (TRACK_LENGTH + 200) / 8),
      }),
    )
    kerb.rotation.y = Math.PI / 2
    kerb.position.set(side * (ROAD_HALF_WIDTH + 0.6), 0.04, 0)
    group.add(kerb)
  }

  const startLine = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, 1.6),
    new THREE.MeshLambertMaterial({ map: checkerTexture(9, 2) }),
  )
  startLine.rotation.x = -Math.PI / 2
  startLine.position.set(0, 0.01, 0)
  group.add(startLine)

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.9, TRACK_LENGTH + 200),
      lambert(0xe8e8e4),
    )
    wall.position.set(side * 16, 0.45, 0)
    group.add(wall)
  }

  const gate = gantry()
  group.add(gate)

  const stand = grandstand()
  stand.rotation.y = Math.PI / 2
  stand.position.set(-38, 0, -60)
  group.add(stand)

  const standFar = grandstand()
  standFar.rotation.y = -Math.PI / 2
  standFar.position.set(38, 0, 140)
  group.add(standFar)

  // Trees behind the walls, thinning out with distance.
  for (let i = 0; i < 46; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const z = -TRACK_HALF + (i / 46) * TRACK_LENGTH + (((i * 37) % 17) - 8)
    const nearStand = side === -1 && z > -160 && z < 40
    const nearStandFar = side === 1 && z > 40 && z < 240
    if (nearStand || nearStandFar) {
      continue
    }
    const item = tree(2.2 + ((i * 13) % 5) * 0.5)
    item.position.set(side * (24 + ((i * 7) % 20)), 0, z)
    group.add(item)
  }

  // Distant low-poly hills, mostly hidden in the fog.
  const hillSpots: Array<{ x: number; z: number; r: number; h: number; c: number }> = [
    { x: -180, z: -320, r: 120, h: 55, c: 0x4c8a3c },
    { x: -240, z: 60, r: 150, h: 70, c: 0x558f43 },
    { x: 200, z: -220, r: 130, h: 60, c: 0x4c8a3c },
    { x: 230, z: 220, r: 160, h: 75, c: 0x5e9a4c },
    { x: -60, z: -TRACK_HALF - 260, r: 200, h: 80, c: 0x558f43 },
    { x: 120, z: TRACK_HALF + 280, r: 220, h: 90, c: 0x4c8a3c },
  ]
  for (const spot of hillSpots) {
    const mesh = hill(spot.r, spot.h, spot.c)
    mesh.position.x = spot.x
    mesh.position.z = spot.z
    group.add(mesh)
  }

  return group
}
