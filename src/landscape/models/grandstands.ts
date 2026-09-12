import * as THREE from 'three'
import type { LandscapeMaterials } from '../palette.ts'

export interface GrandstandOptions {
  id?: string
  name?: string
  length?: number // e.g. 40m
  depth?: number // e.g. 14m
  height?: number // e.g. 10m
  stepCount?: number // e.g. 8 tiers
  position?: [number, number, number]
  rotationY?: number
}

/**
 * Creates a low-poly PS1 Monza grandstand block.
 * Features cream concrete tiers (#E6E2D8), Italian red accent fascia (#B81C2C),
 * cantilevered roof canopy, rear structural columns, and barrier railings.
 */
export function createGrandstandMesh(
  materials: LandscapeMaterials,
  options: GrandstandOptions = {},
): THREE.Group {
  const {
    id = 'grandstand',
    name = 'Monza Grandstand',
    length = 42,
    depth = 14,
    height = 9.5,
    stepCount = 7,
    position = [0, 0, 0],
    rotationY = 0,
  } = options

  const grandstandGroup = new THREE.Group()
  grandstandGroup.name = id
  grandstandGroup.userData = { id, name, type: 'grandstand' }
  grandstandGroup.position.set(position[0], position[1], position[2])
  grandstandGroup.rotation.y = rotationY

  const stepDepth = depth / stepCount
  const stepHeight = height / stepCount

  // 1. Concrete Tiers (Stepped seating deck)
  for (let i = 0; i < stepCount; i++) {
    const tierDepth = depth - i * stepDepth
    const tierHeight = stepHeight
    const tierY = i * stepHeight + tierHeight / 2
    const tierZ = (i * stepDepth) / 2

    const tierGeom = new THREE.BoxGeometry(length, tierHeight, tierDepth)
    const tierMesh = new THREE.Mesh(tierGeom, materials.grandstandBody)
    tierMesh.position.set(0, tierY, tierZ)
    tierMesh.castShadow = true
    tierMesh.receiveShadow = true
    grandstandGroup.add(tierMesh)
  }

  // 2. Italian Racing Red Accent Band (#B81C2C) across front lower fascia
  const redBandGeom = new THREE.BoxGeometry(length + 0.2, 0.9, 0.4)
  const redBandMesh = new THREE.Mesh(redBandGeom, materials.grandstandRedBand)
  redBandMesh.position.set(0, 0.45, -depth / 2 - 0.2)
  redBandMesh.castShadow = true
  grandstandGroup.add(redBandMesh)

  // Secondary red trim on upper back wall
  const upperTrimGeom = new THREE.BoxGeometry(length + 0.2, 0.5, 0.4)
  const upperTrimMesh = new THREE.Mesh(upperTrimGeom, materials.grandstandRedBand)
  upperTrimMesh.position.set(0, height + 0.25, depth / 2)
  grandstandGroup.add(upperTrimMesh)

  // 3. Side Boundary Walls / Endplates
  const sideWallGeom = new THREE.BoxGeometry(0.8, height + 1.2, depth + 1.0)
  const leftWall = new THREE.Mesh(sideWallGeom, materials.grandstandBody)
  leftWall.position.set(-length / 2 - 0.4, (height + 1.2) / 2, 0)
  leftWall.castShadow = true
  grandstandGroup.add(leftWall)

  const rightWall = new THREE.Mesh(sideWallGeom, materials.grandstandBody)
  rightWall.position.set(length / 2 + 0.4, (height + 1.2) / 2, 0)
  rightWall.castShadow = true
  grandstandGroup.add(rightWall)

  // 4. Rear Structural Pillars / Columns
  const pillarCount = 5
  const pillarSpacing = length / (pillarCount - 1)
  const pillarGeom = new THREE.BoxGeometry(0.8, height + 4.5, 0.8)

  for (let p = 0; p < pillarCount; p++) {
    const px = -length / 2 + p * pillarSpacing
    const pillarMesh = new THREE.Mesh(pillarGeom, materials.grandstandBody)
    pillarMesh.position.set(px, (height + 4.5) / 2, depth / 2 + 0.4)
    pillarMesh.castShadow = true
    grandstandGroup.add(pillarMesh)
  }

  // 5. Cantilevered Protective Roof Canopy
  const roofGeom = new THREE.BoxGeometry(length + 2.0, 0.35, depth + 3.0)
  const roofMesh = new THREE.Mesh(roofGeom, materials.grandstandRoof)
  roofMesh.position.set(0, height + 4.2, -0.5)
  roofMesh.rotation.x = 0.08 // slight forward slope
  roofMesh.castShadow = true
  roofMesh.receiveShadow = true
  grandstandGroup.add(roofMesh)

  // 6. Front Safety Railing
  const railGeom = new THREE.BoxGeometry(length, 0.1, 0.1)
  const railMesh = new THREE.Mesh(railGeom, materials.grandstandBody)
  railMesh.position.set(0, 1.3, -depth / 2 - 0.1)
  grandstandGroup.add(railMesh)

  return grandstandGroup
}
