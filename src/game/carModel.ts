import * as THREE from 'three'

export type CarModel = {
  group: THREE.Group
  frontWheels: THREE.Object3D[]
  spinners: THREE.Object3D[]
}

const RED = 0xd0181c
const DARK_RED = 0xa30f14
const TIRE = 0x1a1a1d
const RIM = 0x3a3a40
const CARBON = 0x232326
const WHITE = 0xf2f2f0

function lambert(color: number) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true })
}

function box(
  width: number,
  height: number,
  depth: number,
  color: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    lambert(color),
  )
  mesh.castShadow = true
  return mesh
}

function wheel(radius: number, width: number): THREE.Group {
  const group = new THREE.Group()

  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 10),
    lambert(TIRE),
  )
  tire.rotation.z = Math.PI / 2
  tire.castShadow = true
  group.add(tire)

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.02, 8),
    lambert(RIM),
  )
  rim.rotation.z = Math.PI / 2
  group.add(rim)

  return group
}

/**
 * Low-poly 90s-style F1 car in Ferrari red. Forward is -z.
 * Roughly to scale: ~4.4m long, ~1.9m wide over the wheels.
 */
export function buildCar(): CarModel {
  const group = new THREE.Group()

  const floor = box(1.4, 0.08, 3.6, CARBON)
  floor.position.set(0, 0.22, 0.1)
  group.add(floor)

  const tub = box(0.85, 0.42, 2.0, RED)
  tub.position.set(0, 0.5, 0.2)
  group.add(tub)

  const nose = box(0.42, 0.26, 1.5, RED)
  nose.position.set(0, 0.47, -1.45)
  group.add(nose)

  const noseTip = box(0.3, 0.16, 0.5, WHITE)
  noseTip.position.set(0, 0.43, -2.3)
  group.add(noseTip)

  const frontWing = box(1.7, 0.06, 0.55, WHITE)
  frontWing.position.set(0, 0.24, -2.35)
  group.add(frontWing)

  for (const side of [-1, 1]) {
    const endplate = box(0.06, 0.2, 0.6, RED)
    endplate.position.set(side * 0.85, 0.3, -2.35)
    group.add(endplate)

    const sidepod = box(0.42, 0.32, 1.5, RED)
    sidepod.position.set(side * 0.62, 0.44, 0.45)
    group.add(sidepod)

    const barge = box(0.05, 0.24, 0.5, DARK_RED)
    barge.position.set(side * 0.72, 0.4, -0.5)
    group.add(barge)
  }

  const cockpitRim = box(0.7, 0.12, 0.9, DARK_RED)
  cockpitRim.position.set(0, 0.74, -0.15)
  group.add(cockpitRim)

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 8, 6),
    lambert(0xe8c320),
  )
  helmet.position.set(0, 0.86, -0.1)
  group.add(helmet)

  const airbox = box(0.36, 0.34, 0.7, RED)
  airbox.position.set(0, 0.92, 0.55)
  group.add(airbox)

  const engineCover = box(0.5, 0.4, 1.3, RED)
  engineCover.position.set(0, 0.68, 1.05)
  group.add(engineCover)

  const tail = box(0.36, 0.26, 0.6, DARK_RED)
  tail.position.set(0, 0.55, 1.85)
  group.add(tail)

  const rearWing = box(1.3, 0.07, 0.42, RED)
  rearWing.position.set(0, 1.02, 2.0)
  group.add(rearWing)

  const rearWingLower = box(1.3, 0.05, 0.36, WHITE)
  rearWingLower.position.set(0, 0.82, 2.05)
  group.add(rearWingLower)

  for (const side of [-1, 1]) {
    const plate = box(0.05, 0.4, 0.5, WHITE)
    plate.position.set(side * 0.65, 0.88, 2.0)
    group.add(plate)
  }

  const wingSupport = box(0.08, 0.3, 0.1, CARBON)
  wingSupport.position.set(0, 0.85, 2.1)
  group.add(wingSupport)

  const frontWheels: THREE.Object3D[] = []
  const spinners: THREE.Object3D[] = []

  const wheelSpots: Array<{ x: number; z: number; r: number; w: number }> = [
    { x: -0.82, z: -1.35, r: 0.32, w: 0.34 },
    { x: 0.82, z: -1.35, r: 0.32, w: 0.34 },
    { x: -0.82, z: 1.35, r: 0.35, w: 0.44 },
    { x: 0.82, z: 1.35, r: 0.35, w: 0.44 },
  ]

  for (const spot of wheelSpots) {
    // Steering pivot for the fronts; the tire spins inside it.
    const pivot = new THREE.Group()
    pivot.position.set(spot.x, spot.r, spot.z)

    const tire = wheel(spot.r, spot.w)
    pivot.add(tire)
    group.add(pivot)

    spinners.push(tire)
    if (spot.z < 0) {
      frontWheels.push(pivot)
    }

    const axle = box(Math.abs(spot.x) * 0.9, 0.05, 0.08, CARBON)
    axle.position.set(spot.x / 2, spot.r, spot.z)
    group.add(axle)
  }

  return { group, frontWheels, spinners }
}
