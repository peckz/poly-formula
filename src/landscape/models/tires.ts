import * as THREE from 'three'
import type { LandscapeMaterials } from '../palette.ts'

export interface TireStackPlacement {
  position: [number, number, number]
  rotationY?: number
  rows?: number // 2 or 3 rows
  height?: number // 2 or 3 tires high
  length?: number // e.g. 5 to 20 tires in a wall
}

/**
 * Creates low-poly tire stack geometries for motorsport barriers.
 */
export function createTireStackManager(
  materials: LandscapeMaterials,
  placements: TireStackPlacement[],
): {
  group: THREE.Group
  dispose: () => void
} {
  const group = new THREE.Group()
  group.name = 'Landscape_TireStacks'

  // Standard tire dimensions: radius ~0.36m, height ~0.32m
  const tireRadius = 0.36
  const tireHeight = 0.32
  const tireSegments = 10

  const tireGeom = new THREE.CylinderGeometry(tireRadius, tireRadius, tireHeight, tireSegments)
  tireGeom.translate(0, tireHeight / 2, 0)

  // Calculate total tires
  let totalBlackTires = 0
  let totalWhiteTires = 0

  for (const p of placements) {
    const stackHeight = p.height || 3
    const stackLength = p.length || 6
    const stackRows = p.rows || 2
    const count = stackHeight * stackLength * stackRows
    // Alternating white band (e.g. 1 in 3 or striped)
    const whiteCount = Math.floor(count / 3)
    totalWhiteTires += whiteCount
    totalBlackTires += count - whiteCount
  }

  if (totalBlackTires === 0 && totalWhiteTires === 0) {
    tireGeom.dispose()
    return { group, dispose: () => {} }
  }

  const blackInstanced = new THREE.InstancedMesh(tireGeom, materials.tireBlack, totalBlackTires)
  const whiteInstanced = new THREE.InstancedMesh(tireGeom, materials.tireWhite, totalWhiteTires)

  blackInstanced.castShadow = true
  whiteInstanced.castShadow = true

  let blackIdx = 0
  let whiteIdx = 0
  const dummy = new THREE.Object3D()

  for (const p of placements) {
    const stackHeight = p.height || 3
    const stackLength = p.length || 6
    const stackRows = p.rows || 2
    const rotY = p.rotationY || 0

    const cosR = Math.cos(rotY)
    const sinR = Math.sin(rotY)

    for (const r of Array.from({ length: stackRows }, (_, i) => i)) {
      for (const l of Array.from({ length: stackLength }, (_, i) => i)) {
        for (const h of Array.from({ length: stackHeight }, (_, i) => i)) {
          // Local offset in stack coordinate frame
          const localX = (l - stackLength / 2 + 0.5) * (tireRadius * 1.9)
          const localZ = (r - stackRows / 2 + 0.5) * (tireRadius * 1.9)
          const localY = h * tireHeight

          // World position
          const worldX = p.position[0] + localX * cosR - localZ * sinR
          const worldZ = p.position[2] + localX * sinR + localZ * cosR
          const worldY = p.position[1] + localY

          dummy.position.set(worldX, worldY, worldZ)
          dummy.rotation.set(0, rotY, 0)
          dummy.scale.set(1, 1, 1)
          dummy.updateMatrix()

          // Stripe pattern: white on middle tier or every 3rd column
          const isWhite = (l + h) % 3 === 0
          if (isWhite && whiteIdx < totalWhiteTires) {
            whiteInstanced.setMatrixAt(whiteIdx++, dummy.matrix)
          } else if (blackIdx < totalBlackTires) {
            blackInstanced.setMatrixAt(blackIdx++, dummy.matrix)
          }
        }
      }
    }
  }

  blackInstanced.instanceMatrix.needsUpdate = true
  whiteInstanced.instanceMatrix.needsUpdate = true

  group.add(blackInstanced)
  group.add(whiteInstanced)

  return {
    group,
    dispose() {
      tireGeom.dispose()
    },
  }
}
