import * as THREE from 'three'
import type { LandscapeMaterials } from '../palette.ts'
import type { SponsorTextureManager } from '../textures/sponsors.ts'
import type { SponsorBrand } from '../types.ts'

export interface BillboardOptions {
  id?: string
  brand: SponsorBrand
  width?: number // e.g. 12m
  height?: number // e.g. 3m
  elevation?: number // e.g. 2.5m off ground
  position?: [number, number, number]
  rotationY?: number
  doubleSided?: boolean
}

/**
 * Creates a low-poly PS1 trackside sponsor billboard.
 * Features galvanized perimeter frame (#D8D4CC), dual steel support posts (#4A4D52),
 * diagonal bracing struts, and textured sponsor graphics face.
 */
export function createBillboardMesh(
  materials: LandscapeMaterials,
  textureManager: SponsorTextureManager,
  options: BillboardOptions,
): THREE.Group {
  const {
    id,
    brand,
    width = 12,
    height = 3.0,
    elevation = 2.4,
    position = [0, 0, 0],
    rotationY = 0,
    doubleSided = true,
  } = options

  const billboardGroup = new THREE.Group()
  if (id) {
    billboardGroup.name = id
  }
  billboardGroup.userData = { id, brand, type: 'billboard' }
  billboardGroup.position.set(position[0], position[1], position[2])
  billboardGroup.rotation.y = rotationY

  const boardCenterY = elevation + height / 2

  // 1. Steel Support Posts (#4A4D52)
  const postGeom = new THREE.BoxGeometry(0.35, elevation + height * 0.8, 0.35)
  const postSpread = width * 0.65

  const leftPost = new THREE.Mesh(postGeom, materials.billboardPosts)
  leftPost.position.set(-postSpread / 2, (elevation + height * 0.8) / 2, 0)
  leftPost.castShadow = true
  billboardGroup.add(leftPost)

  const rightPost = new THREE.Mesh(postGeom, materials.billboardPosts)
  rightPost.position.set(postSpread / 2, (elevation + height * 0.8) / 2, 0)
  rightPost.castShadow = true
  billboardGroup.add(rightPost)

  // 2. Diagonal A-Frame Support Struts (rear braces)
  const strutLength = Math.hypot(elevation + height * 0.5, 2.0)
  const strutGeom = new THREE.BoxGeometry(0.2, strutLength, 0.2)

  const leftStrut = new THREE.Mesh(strutGeom, materials.billboardPosts)
  leftStrut.position.set(-postSpread / 2, (elevation + height * 0.5) / 2, 1.0)
  leftStrut.rotation.x = Math.atan2(2.0, elevation + height * 0.5)
  billboardGroup.add(leftStrut)

  const rightStrut = new THREE.Mesh(strutGeom, materials.billboardPosts)
  rightStrut.position.set(postSpread / 2, (elevation + height * 0.5) / 2, 1.0)
  rightStrut.rotation.x = Math.atan2(2.0, elevation + height * 0.5)
  billboardGroup.add(rightStrut)

  // 3. Perimeter Frame Box (#D8D4CC)
  const frameGeom = new THREE.BoxGeometry(width + 0.4, height + 0.4, 0.3)
  const frameMesh = new THREE.Mesh(frameGeom, materials.billboardFrame)
  frameMesh.position.set(0, boardCenterY, 0)
  frameMesh.castShadow = true
  billboardGroup.add(frameMesh)

  // 4. Sponsor Front Texture Quad (Facing +Z towards oncoming traffic)
  const texture = textureManager.getTexture(brand)
  const frontMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide,
  })

  const faceGeom = new THREE.PlaneGeometry(width, height)
  const frontFace = new THREE.Mesh(faceGeom, frontMaterial)
  frontFace.position.set(0, boardCenterY, 0.16)
  frontFace.rotation.y = 0 // Faces +Z towards oncoming cars
  billboardGroup.add(frontFace)

  // 5. Back Texture Quad (Facing -Z)
  if (doubleSided) {
    const backMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide,
    })
    const backFace = new THREE.Mesh(faceGeom, backMaterial)
    backFace.position.set(0, boardCenterY, -0.16)
    backFace.rotation.y = Math.PI // Faces -Z
    billboardGroup.add(backFace)
  }

  return billboardGroup
}
