import * as THREE from 'three'
import {
  MONZA_RUNOFF_AREAS,
  MONZA_SCENERY_PLACEMENTS,
  MONZA_SNAP_TARGETS,
  MONZA_TIRE_STACK_PLACEMENTS,
  generateParkTreePlacements,
} from './data/placements.ts'
import { createBillboardMesh } from './models/billboards.ts'
import { createGrandstandMesh } from './models/grandstands.ts'
import { createTerrain } from './models/terrain.ts'
import { createTireStackManager } from './models/tires.ts'
import { createTreeManager, type TreeInstance } from './models/trees.ts'
import { LANDSCAPE_COLORS, LandscapeMaterials } from './palette.ts'
import { SponsorTextureManager } from './textures/sponsors.ts'
import type {
  LandscapeHandle,
  LandscapeOptions,
  SnapMarkerName,
  SnapTarget,
} from './types.ts'

export * from './types.ts'
export * from './palette.ts'
export * from './textures/sponsors.ts'
export * from './models/trees.ts'
export * from './models/grandstands.ts'
export * from './models/billboards.ts'
export * from './models/tires.ts'
export * from './models/terrain.ts'
export * from './data/placements.ts'

/**
 * Creates and mounts the Monza Royal Park landscape scaffold into the Three.js scene.
 *
 * Visual language:
 * - Monza park aesthetic (clean minimal PS1 / low-poly park circuit look)
 * - 8-12 color atlas (Lambert / vertex colors, no PBR overhead)
 * - Sky #8EC4E0, Fog #B4C4B8, Grass #4F7A3E, Canopy #2D4A28, Grandstands #E6E2D8 + #B81C2C
 * - Modular snap targets (S/F, Rettifilo, Parabolica) ready for Track Engineer ribbon JSON
 */
export function createLandscape(
  scene: THREE.Scene,
  options: LandscapeOptions = {},
): LandscapeHandle {
  const {
    enableLighting = true,
    enableFog = true,
    enableGround = true,
    placements = MONZA_SCENERY_PLACEMENTS,
    customSponsorTextures,
  } = options

  const rootGroup = new THREE.Group()
  rootGroup.name = 'Monza_Landscape_Root'
  scene.add(rootGroup)

  const disposables: Array<{ dispose: () => void }> = []

  // 1. Scene Fog & Sky Atmosphere
  if (enableFog) {
    scene.background = new THREE.Color(LANDSCAPE_COLORS.sky)
    scene.fog = new THREE.FogExp2(LANDSCAPE_COLORS.fog, 0.0014)
  }

  // 2. Lighting (Warm Italian afternoon sunlight & ambient fill)
  if (enableLighting) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95)
    ambientLight.name = 'Landscape_Ambient'
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfff8e8, 1.65)
    sunLight.name = 'Landscape_Sun'
    sunLight.position.set(60, 100, 70)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 10
    sunLight.shadow.camera.far = 300
    sunLight.shadow.camera.left = -90
    sunLight.shadow.camera.right = 90
    sunLight.shadow.camera.top = 90
    sunLight.shadow.camera.bottom = -90
    sunLight.shadow.bias = -0.0005
    scene.add(sunLight)

    disposables.push({
      dispose() {
        scene.remove(ambientLight)
        scene.remove(sunLight)
        sunLight.dispose()
      },
    })
  }

  // 3. Materials & Texture Managers
  const materials = new LandscapeMaterials()
  disposables.push(materials)

  const textureManager = new SponsorTextureManager(customSponsorTextures)
  textureManager.preloadAll()
  disposables.push(textureManager)

  // 4. Ground Terrain & Runoff Areas
  if (enableGround) {
    const terrain = createTerrain(materials, MONZA_RUNOFF_AREAS)
    rootGroup.add(terrain.group)
    disposables.push(terrain)
  }

  // 5. Grandstand Blocks
  const grandstandPlacements = placements.filter((p) => p.type === 'grandstand')
  for (const gp of grandstandPlacements) {
    const grandstand = createGrandstandMesh(materials, {
      id: gp.id,
      position: gp.position,
      rotationY: gp.rotationY || 0,
      ...(gp.properties || {}),
    })
    rootGroup.add(grandstand)
  }

  // 6. Sponsor Billboards
  const billboardPlacements = placements.filter((p) => p.type === 'billboard')
  for (const bp of billboardPlacements) {
    if (bp.brand) {
      const billboard = createBillboardMesh(materials, textureManager, {
        id: bp.id,
        brand: bp.brand,
        position: bp.position,
        rotationY: bp.rotationY || 0,
        ...(bp.properties || {}),
      })
      rootGroup.add(billboard)
    }
  }

  // 7. Tire Stacks
  const tireManager = createTireStackManager(materials, MONZA_TIRE_STACK_PLACEMENTS)
  rootGroup.add(tireManager.group)
  disposables.push(tireManager)

  // 8. Groves of Monza Park Trees (Poplars & Oaks)
  const treePlacements = generateParkTreePlacements()
  const allTreePlacements: TreeInstance[] = [
    ...placements
      .filter((p) => p.type === 'tree')
      .map((p) => ({
        type: (p.subtype === 'oak' ? 'oak' : 'poplar') as 'poplar' | 'oak',
        position: p.position,
        rotationY: p.rotationY,
        scale: p.scale,
      })),
    ...treePlacements.map((p) => ({
      type: (p.subtype === 'oak' ? 'oak' : 'poplar') as 'poplar' | 'oak',
      position: p.position,
      rotationY: p.rotationY,
      scale: p.scale,
    })),
  ]

  const treeManager = createTreeManager(materials, allTreePlacements)
  rootGroup.add(treeManager.group)
  disposables.push(treeManager)

  // 9. Snap Targets Reference State
  const snapTargetsMap = new Map<SnapMarkerName, SnapTarget>()
  for (const st of MONZA_SNAP_TARGETS) {
    snapTargetsMap.set(st.name, { ...st })
  }

  const handle: LandscapeHandle = {
    group: rootGroup,
    snapTargets: Array.from(snapTargetsMap.values()),
    placements: [...placements, ...treePlacements],
    getSnapTarget(name: SnapMarkerName) {
      return snapTargetsMap.get(name)
    },
    rebindSnapTarget(name: SnapMarkerName, position: [number, number, number], rotationY = 0) {
      const target = snapTargetsMap.get(name)
      if (!target) {
        return
      }

      const dx = position[0] - target.position[0]
      const dy = position[1] - target.position[1]
      const dz = position[2] - target.position[2]
      const dRot = rotationY - target.rotationY

      target.position = [...position]
      target.rotationY = rotationY

      // Shift child objects associated with this marker
      for (const itemId of target.associatedItemIds) {
        const obj = rootGroup.getObjectByName(itemId)
        if (obj) {
          obj.position.x += dx
          obj.position.y += dy
          obj.position.z += dz
          obj.rotation.y += dRot
        }
      }
    },
    dispose() {
      scene.remove(rootGroup)
      for (const d of disposables) {
        d.dispose()
      }
    },
  }

  return handle
}
