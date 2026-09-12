import * as THREE from 'three'
import { LANDSCAPE_COLORS, type LandscapeMaterials } from '../palette.ts'

export interface RunoffArea {
  id?: string
  type: 'asphalt' | 'gravel'
  position: [number, number, number]
  width: number
  length: number
  rotationY?: number
}

/**
 * Creates the Monza park ground context: expansive grass terrain,
 * designated runoff asphalt aprons (#3D3D42), and gravel trap beds (#C2B08A).
 */
export function createTerrain(
  materials: LandscapeMaterials,
  runoffAreas: RunoffArea[] = [],
): {
  group: THREE.Group
  dispose: () => void
} {
  const group = new THREE.Group()
  group.name = 'Landscape_Terrain'
  const disposables: Array<{ dispose: () => void }> = []

  // 1. Procedural Monza Royal Park Grass Texture
  let grassMat: THREE.MeshLambertMaterial

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    if (ctx) {
      // Base lush warm olive park grass (#5B7E3E)
      ctx.fillStyle = '#5b7e3e'
      ctx.fillRect(0, 0, 512, 512)

      // Subtle warm olive tonal variations for low-poly / PS1 grass feel
      ctx.fillStyle = '#4e6e34'
      ctx.fillRect(0, 0, 256, 256)
      ctx.fillRect(256, 256, 256, 256)

      ctx.fillStyle = '#668b44'
      ctx.fillRect(128, 128, 256, 256)

      // Fine olive-gold stippling pattern
      ctx.fillStyle = '#547738'
      for (let i = 0; i < 60; i++) {
        const rx = (i * 37) % 512
        const ry = (i * 73) % 512
        ctx.fillRect(rx, ry, 12, 8)
      }
    }

    const grassTexture = new THREE.CanvasTexture(canvas)
    grassTexture.wrapS = THREE.RepeatWrapping
    grassTexture.wrapT = THREE.RepeatWrapping
    grassTexture.repeat.set(300, 300)
    grassTexture.anisotropy = 4

    grassMat = new THREE.MeshLambertMaterial({
      map: grassTexture,
      color: LANDSCAPE_COLORS.grass,
    })
    disposables.push(grassMat, grassTexture)
  } else {
    grassMat = new THREE.MeshLambertMaterial({
      color: LANDSCAPE_COLORS.grass,
    })
    disposables.push(grassMat)
  }

  const groundGeom = new THREE.PlaneGeometry(4000, 4000)
  const groundMesh = new THREE.Mesh(groundGeom, grassMat)
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.position.y = -0.01
  groundMesh.receiveShadow = true
  group.add(groundMesh)

  disposables.push(groundGeom)

  // 2. Distant Park Perimeter Berms / Treeline backdrop
  const bermGeom = new THREE.RingGeometry(1600, 1950, 48)
  const bermMat = new THREE.MeshLambertMaterial({
    color: LANDSCAPE_COLORS.canopy,
  })
  const bermMesh = new THREE.Mesh(bermGeom, bermMat)
  bermMesh.rotation.x = -Math.PI / 2
  bermMesh.position.y = 1.0
  group.add(bermMesh)
  disposables.push(bermGeom, bermMat)

  // 3. Runoff Asphalt Aprons (#3D3D42) and Gravel Traps (#C2B08A)
  for (const r of runoffAreas) {
    const geom = new THREE.PlaneGeometry(r.width, r.length)
    const mat = r.type === 'gravel' ? materials.gravel : materials.runoffAsphalt
    const mesh = new THREE.Mesh(geom, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.rotation.z = r.rotationY || 0
    mesh.position.set(r.position[0], 0.005, r.position[2])
    mesh.receiveShadow = true
    group.add(mesh)
    disposables.push(geom)
  }

  // 4. Provisional Track Ribbon / Straight Runway (North-South main straight)
  // Note: Track engineer owns the final ribbon/centreline JSON; this serves as provisional ground context
  const runwayGeom = new THREE.PlaneGeometry(16, 4000)
  const runwayMesh = new THREE.Mesh(runwayGeom, materials.runoffAsphalt)
  runwayMesh.rotation.x = -Math.PI / 2
  runwayMesh.position.set(0, 0.01, 0)
  runwayMesh.receiveShadow = true
  group.add(runwayMesh)
  disposables.push(runwayGeom)

  // Provisional Kerb Stripes along the main straight (Monza red & white kerb style)
  const kerbGeom = new THREE.PlaneGeometry(0.8, 4000)
  const kerbMatLeft = new THREE.MeshLambertMaterial({ color: LANDSCAPE_COLORS.grandstandRedBand })
  const kerbMeshLeft = new THREE.Mesh(kerbGeom, kerbMatLeft)
  kerbMeshLeft.rotation.x = -Math.PI / 2
  kerbMeshLeft.position.set(-8.4, 0.015, 0)
  group.add(kerbMeshLeft)

  const kerbMeshRight = new THREE.Mesh(kerbGeom, kerbMatLeft)
  kerbMeshRight.rotation.x = -Math.PI / 2
  kerbMeshRight.position.set(8.4, 0.015, 0)
  group.add(kerbMeshRight)
  disposables.push(kerbGeom, kerbMatLeft)

  return {
    group,
    dispose() {
      for (const item of disposables) {
        item.dispose()
      }
    },
  }
}
