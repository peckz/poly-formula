import * as THREE from 'three'
import type { LandscapeMaterials } from '../palette.ts'
import type { TreeType } from '../types.ts'

/**
 * Creates low-poly Lombardy Poplar geometry (Type A).
 * Tall, slender columnar canopy typical of Monza Royal Park.
 */
export function createPoplarGeometry(): { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry } {
  // 1. Trunk (slender 6-sided cylinder)
  const trunkGeom = new THREE.CylinderGeometry(0.35, 0.55, 4.0, 6)
  trunkGeom.translate(0, 2.0, 0)

  // 2. Canopy (3 tiered 7-sided conical layers tapering upwards, height ~14m)
  const layer1 = new THREE.ConeGeometry(2.2, 5.5, 7)
  layer1.translate(0, 5.5, 0)

  const layer2 = new THREE.ConeGeometry(1.8, 5.0, 7)
  layer2.translate(0, 8.5, 0)

  const layer3 = new THREE.ConeGeometry(1.2, 4.5, 7)
  layer3.translate(0, 11.5, 0)

  // Merge canopy geometries
  const canopyGeom = mergeGeometries([layer1, layer2, layer3])
  layer1.dispose()
  layer2.dispose()
  layer3.dispose()

  return { trunk: trunkGeom, canopy: canopyGeom }
}

/**
 * Creates low-poly Broadleaf Park Oak / Stone Pine geometry (Type B).
 * Sturdy trunk with stepped faceted foliage clusters (~11m wide, ~10m tall).
 */
export function createOakGeometry(): { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry } {
  // 1. Trunk (heavier 7-sided tapered cylinder with root flare)
  const trunkGeom = new THREE.CylinderGeometry(0.55, 0.9, 3.5, 7)
  trunkGeom.translate(0, 1.75, 0)

  // 2. Canopy (faceted low-poly icosahedral clusters)
  const centerCluster = new THREE.IcosahedronGeometry(3.6, 0)
  centerCluster.scale(1.2, 0.9, 1.2)
  centerCluster.translate(0, 6.0, 0)

  const leftCluster = new THREE.IcosahedronGeometry(2.6, 0)
  leftCluster.scale(1.1, 0.85, 1.0)
  leftCluster.translate(-2.2, 5.0, 0.5)

  const rightCluster = new THREE.IcosahedronGeometry(2.8, 0)
  rightCluster.scale(1.0, 0.85, 1.1)
  rightCluster.translate(2.2, 5.2, -0.4)

  const topCluster = new THREE.IcosahedronGeometry(2.3, 0)
  topCluster.scale(1.0, 0.9, 1.0)
  topCluster.translate(0.2, 7.8, 0.1)

  const canopyGeom = mergeGeometries([centerCluster, leftCluster, rightCluster, topCluster])
  centerCluster.dispose()
  leftCluster.dispose()
  rightCluster.dispose()
  topCluster.dispose()

  return { trunk: trunkGeom, canopy: canopyGeom }
}

/**
 * Simple helper to merge BufferGeometries with matching attributes.
 */
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalPos = 0
  let totalNorm = 0
  let totalIndex = 0

  for (const g of geometries) {
    const pos = g.getAttribute('position')
    const norm = g.getAttribute('normal')
    if (pos) {
      totalPos += pos.count * 3
    }
    if (norm) {
      totalNorm += norm.count * 3
    }
    if (g.index) {
      totalIndex += g.index.count
    }
  }

  const mergedPos = new Float32Array(totalPos)
  const mergedNorm = new Float32Array(totalNorm)
  const mergedIndex = totalIndex > 0 ? new Uint32Array(totalIndex) : null

  let posOffset = 0
  let normOffset = 0
  let indexOffset = 0
  let vertexOffset = 0

  for (const g of geometries) {
    const pos = g.getAttribute('position')
    const norm = g.getAttribute('normal')
    if (pos) {
      mergedPos.set(pos.array, posOffset)
      posOffset += pos.count * 3
    }
    if (norm) {
      mergedNorm.set(norm.array, normOffset)
      normOffset += norm.count * 3
    }
    if (g.index && mergedIndex) {
      for (let i = 0; i < g.index.count; i++) {
        mergedIndex[indexOffset + i] = g.index.getX(i) + vertexOffset
      }
      indexOffset += g.index.count
    }
    if (pos) {
      vertexOffset += pos.count
    }
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3))
  if (mergedIndex) {
    merged.setIndex(new THREE.BufferAttribute(mergedIndex, 1))
  }
  return merged
}

export interface TreeInstance {
  type: TreeType
  position: [number, number, number]
  rotationY?: number
  scale?: number | [number, number, number]
}

/**
 * Builds high-performance instanced meshes for groves of trees.
 */
export function createTreeManager(
  materials: LandscapeMaterials,
  trees: TreeInstance[],
): {
  group: THREE.Group
  dispose: () => void
} {
  const group = new THREE.Group()
  group.name = 'Landscape_Trees'

  const poplarTrees = trees.filter((t) => t.type === 'poplar')
  const oakTrees = trees.filter((t) => t.type === 'oak')

  const poplarGeom = createPoplarGeometry()
  const oakGeom = createOakGeometry()

  const dummy = new THREE.Object3D()

  // 1. Poplar instanced meshes
  if (poplarTrees.length > 0) {
    const poplarTrunks = new THREE.InstancedMesh(poplarGeom.trunk, materials.trunk, poplarTrees.length)
    const poplarCanopies = new THREE.InstancedMesh(poplarGeom.canopy, materials.canopyPoplar, poplarTrees.length)

    poplarTrunks.castShadow = true
    poplarCanopies.castShadow = true
    poplarCanopies.receiveShadow = true

    poplarTrees.forEach((t, i) => {
      dummy.position.set(t.position[0], t.position[1], t.position[2])
      dummy.rotation.set(0, t.rotationY || 0, 0)
      if (typeof t.scale === 'number') {
        dummy.scale.set(t.scale, t.scale, t.scale)
      } else if (Array.isArray(t.scale)) {
        dummy.scale.set(t.scale[0], t.scale[1], t.scale[2])
      } else {
        dummy.scale.set(1, 1, 1)
      }
      dummy.updateMatrix()
      poplarTrunks.setMatrixAt(i, dummy.matrix)
      poplarCanopies.setMatrixAt(i, dummy.matrix)
    })

    poplarTrunks.instanceMatrix.needsUpdate = true
    poplarCanopies.instanceMatrix.needsUpdate = true

    group.add(poplarTrunks)
    group.add(poplarCanopies)
  }

  // 2. Oak instanced meshes
  if (oakTrees.length > 0) {
    const oakTrunks = new THREE.InstancedMesh(oakGeom.trunk, materials.trunk, oakTrees.length)
    const oakCanopies = new THREE.InstancedMesh(oakGeom.canopy, materials.canopyOak, oakTrees.length)

    oakTrunks.castShadow = true
    oakCanopies.castShadow = true
    oakCanopies.receiveShadow = true

    oakTrees.forEach((t, i) => {
      dummy.position.set(t.position[0], t.position[1], t.position[2])
      dummy.rotation.set(0, t.rotationY || 0, 0)
      if (typeof t.scale === 'number') {
        dummy.scale.set(t.scale, t.scale, t.scale)
      } else if (Array.isArray(t.scale)) {
        dummy.scale.set(t.scale[0], t.scale[1], t.scale[2])
      } else {
        dummy.scale.set(1, 1, 1)
      }
      dummy.updateMatrix()
      oakTrunks.setMatrixAt(i, dummy.matrix)
      oakCanopies.setMatrixAt(i, dummy.matrix)
    })

    oakTrunks.instanceMatrix.needsUpdate = true
    oakCanopies.instanceMatrix.needsUpdate = true

    group.add(oakTrunks)
    group.add(oakCanopies)
  }

  return {
    group,
    dispose() {
      poplarGeom.trunk.dispose()
      poplarGeom.canopy.dispose()
      oakGeom.trunk.dispose()
      oakGeom.canopy.dispose()
    },
  }
}
