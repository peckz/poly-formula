import * as THREE from 'three'
import type { LandscapeMaterials } from '../palette.ts'

export interface GrandstandOptions {
  id?: string
  name?: string
  length?: number // e.g. 42m
  depth?: number // e.g. 14m
  height?: number // e.g. 9.5m
  stepCount?: number // e.g. 7 tiers
  position?: [number, number, number]
  rotationY?: number
}

/**
 * Creates a low-poly grandstand block matching the reference aesthetic:
 * Light blue & off-white tiered seat steps, dark angled cantilevered roof,
 * Italian racing red accent trim, white/cream side walls and rear pillars.
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

  // 1. Stepped Tiers (Alternating light sky-blue and off-white as in reference)
  for (let i = 0; i < stepCount; i++) {
    const tierDepth = depth - i * stepDepth
    const tierHeight = stepHeight
    const tierY = i * stepHeight + tierHeight / 2
    const tierZ = (i * stepDepth) / 2

    const tierGeom = new THREE.BoxGeometry(length, tierHeight, tierDepth)
    const tierMat = i % 2 === 0 ? materials.grandstandBlue : materials.grandstandBody
    const tierMesh = new THREE.Mesh(tierGeom, tierMat)
    tierMesh.position.set(0, tierY, tierZ)
    tierMesh.castShadow = true
    tierMesh.receiveShadow = true
    grandstandGroup.add(tierMesh)
  }

  // 2. Italian Racing Red Accent Band across front lower fascia
  const redBandGeom = new THREE.BoxGeometry(length + 0.2, 0.8, 0.4)
  const redBandMesh = new THREE.Mesh(redBandGeom, materials.grandstandRedBand)
  redBandMesh.position.set(0, 0.4, -depth / 2 - 0.2)
  redBandMesh.castShadow = true
  grandstandGroup.add(redBandMesh)

  // 3. Side Boundary Walls / Endplates (Clean white/cream)
  const sideWallGeom = new THREE.BoxGeometry(0.8, height + 1.2, depth + 1.0)
  const leftWall = new THREE.Mesh(sideWallGeom, materials.grandstandBody)
  leftWall.position.set(-length / 2 - 0.4, (height + 1.2) / 2, 0)
  leftWall.castShadow = true
  grandstandGroup.add(leftWall)

  const rightWall = new THREE.Mesh(sideWallGeom, materials.grandstandBody)
  rightWall.position.set(length / 2 + 0.4, (height + 1.2) / 2, 0)
  rightWall.castShadow = true
  grandstandGroup.add(rightWall)

  // 4. Rear Structural Support Pillars
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

  // 5. Dark Cantilevered Protective Roof Canopy (matching reference)
  const roofGeom = new THREE.BoxGeometry(length + 2.0, 0.4, depth + 3.0)
  const roofMesh = new THREE.Mesh(roofGeom, materials.grandstandRoof)
  roofMesh.position.set(0, height + 4.2, -0.5)
  roofMesh.rotation.x = 0.08 // slight forward slope
  roofMesh.castShadow = true
  roofMesh.receiveShadow = true
  grandstandGroup.add(roofMesh)

  // 6. Front Safety Railing
  const railGeom = new THREE.BoxGeometry(length, 0.1, 0.1)
  const railMesh = new THREE.Mesh(railGeom, materials.fencePosts)
  railMesh.position.set(0, 1.2, -depth / 2 - 0.1)
  grandstandGroup.add(railMesh)

  return grandstandGroup
}

/**
 * Creates low-poly sponsor gantry bridge (coral arch with yellow pillars as in reference image).
 */
export function createGantryBridgeMesh(
  materials: LandscapeMaterials,
  options: {
    id?: string
    width?: number // track span (e.g. 24m)
    height?: number // clearance height (e.g. 6.5m)
    position?: [number, number, number]
    rotationY?: number
  } = {},
): THREE.Group {
  const { id = 'gantry-bridge', width = 24, height = 6.5, position = [0, 0, 0], rotationY = 0 } = options
  const group = new THREE.Group()
  group.name = id
  group.position.set(position[0], position[1], position[2])
  group.rotation.y = rotationY

  const pillarWidth = 2.4
  const pillarDepth = 2.0
  const headerHeight = 2.2

  // Left Yellow Pillar (#F2CC5B)
  const leftPillarGeom = new THREE.BoxGeometry(pillarWidth, height, pillarDepth)
  const leftPillar = new THREE.Mesh(leftPillarGeom, materials.gantryPillars)
  leftPillar.position.set(-width / 2, height / 2, 0)
  leftPillar.castShadow = true
  group.add(leftPillar)

  // Right Yellow Pillar (#F2CC5B)
  const rightPillar = new THREE.Mesh(leftPillarGeom, materials.gantryPillars)
  rightPillar.position.set(width / 2, height / 2, 0)
  rightPillar.castShadow = true
  group.add(rightPillar)

  // Top Warm Coral / Terracotta Arch Header (#E87A54)
  const archGeom = new THREE.BoxGeometry(width + pillarWidth, headerHeight, pillarDepth + 0.2)
  const archMesh = new THREE.Mesh(archGeom, materials.gantryArch)
  archMesh.position.set(0, height + headerHeight / 2, 0)
  archMesh.castShadow = true
  group.add(archMesh)

  return group
}
