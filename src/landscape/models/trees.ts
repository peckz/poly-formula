import * as THREE from 'three'
import type { LandscapeMaterials } from '../palette.ts'
import type { TreeType } from '../types.ts'

/**
 * Creates low-poly Poplar / Cypress geometry (Type A).
 * Slender brown trunk with faceted blocky conical canopy.
 */
export function createPoplarGeometry(): { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry } {
  // 1. Trunk (slender faceted 5-sided cylinder)
  const trunkGeom = new THREE.CylinderGeometry(0.3, 0.45, 3.8, 5)
  trunkGeom.translate(0, 1.9, 0)

  // 2. Blocky conical canopy (3 stepped faceted 5-sided pyramids)
  const layer1 = new THREE.ConeGeometry(2.0, 4.5, 5)
  layer1.translate(0, 4.8, 0)

  const layer2 = new THREE.ConeGeometry(1.6, 4.2, 5)
  layer2.translate(0, 7.5, 0)

  const layer3 = new THREE.ConeGeometry(1.1, 3.8, 5)
  layer3.translate(0, 10.2, 0)

  const canopyGeom = mergeGeometries([layer1, layer2, layer3])
  layer1.dispose()
  layer2.dispose()
  layer3.dispose()

  return { trunk: trunkGeom, canopy: canopyGeom }
}

/**
 * Creates blocky low-poly Oak / Park Tree geometry (Type B) matching reference style.
 * Brown angled trunk with faceted blocky foliage clusters.
 */
export function createOakGeometry(): { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry } {
  // 1. Trunk (faceted 6-sided cylinder)
  const trunkGeom = new THREE.CylinderGeometry(0.45, 0.7, 3.2, 6)
  trunkGeom.translate(0, 1.6, 0)

  // 2. Blocky dodecahedral / icosahedral canopy clusters
  const mainCluster = new THREE.DodecahedronGeometry(2.8, 0)
  mainCluster.scale(1.1, 0.9, 1.1)
  mainCluster.translate(0, 4.8, 0)

  const leftCluster = new THREE.DodecahedronGeometry(2.0, 0)
  leftCluster.scale(1.0, 0.8, 1.0)
  leftCluster.translate(-1.6, 4.2, 0.3)

  const rightCluster = new THREE.DodecahedronGeometry(2.2, 0)
  rightCluster.scale(1.0, 0.85, 1.0)
  rightCluster.translate(1.6, 4.4, -0.3)

  const topCluster = new THREE.DodecahedronGeometry(1.8, 0)
  topCluster.scale(0.9, 0.9, 0.9)
  topCluster.translate(0.1, 6.4, 0.1)

  const canopyGeom = mergeGeometries([mainCluster, leftCluster, rightCluster, topCluster])
  mainCluster.dispose()
  leftCluster.dispose()
  rightCluster.dispose()
  topCluster.dispose()

  return { trunk: trunkGeom, canopy: canopyGeom }
}

/**
 * Creates low-poly faceted rock / boulder geometry.
 */
export function createRockGeometry(): THREE.BufferGeometry {
  const rock = new THREE.DodecahedronGeometry(2.0, 0)
  rock.scale(1.4, 0.9, 1.2)
  rock.translate(0, 1.0, 0)
  return rock
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
