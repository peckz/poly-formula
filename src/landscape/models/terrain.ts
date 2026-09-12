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
 * Creates the low-poly Monza park ground context matching reference aesthetic:
 * - Warm mint / sage grass plane near track (#82B87C)
 * - Distant faceted olive/forest green rolling hills (#4D7540 / #3D6032)
 * - Low-poly grey boulders along verges (#94A3AF)
 * - Trackside safety barrier fence posts & wires
 * - Designated runoff asphalt aprons & golden gravel trap beds
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

  // 1. Procedural Warm Mint / Sage Grass Ground Texture
  let grassMat: THREE.MeshLambertMaterial

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    if (ctx) {
      // Warm mint / sage base (#82B87C)
      ctx.fillStyle = '#82b87c'
      ctx.fillRect(0, 0, 512, 512)

      // Subtle sage tile variation (#73a56e)
      ctx.fillStyle = '#73a56e'
      ctx.fillRect(0, 0, 256, 256)
      ctx.fillRect(256, 256, 256, 256)

      // Sunlit soft highlight (#8fc286)
      ctx.fillStyle = '#8fc286'
      ctx.fillRect(128, 128, 256, 256)

      // Soft stippling pattern
      ctx.fillStyle = '#6e9e69'
      for (let i = 0; i < 50; i++) {
        const rx = (i * 43) % 512
        const ry = (i * 79) % 512
        ctx.fillRect(rx, ry, 14, 10)
      }
    }

    const grassTexture = new THREE.CanvasTexture(canvas)
    grassTexture.wrapS = THREE.RepeatWrapping
    grassTexture.wrapT = THREE.RepeatWrapping
    grassTexture.repeat.set(240, 240)
    grassTexture.anisotropy = 4

    grassMat = new THREE.MeshLambertMaterial({
      map: grassTexture,
      color: LANDSCAPE_COLORS.grass,
      flatShading: false,
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

  // 2. Faceted Low-Poly Olive/Forest Hills in Perimeter Background
  // Creates iconic pyramid/cone faceted mountain silhouettes from the reference image
  const hillGeomA = new THREE.ConeGeometry(75, 55, 6)
  hillGeomA.computeVertexNormals()
  const hillGeomB = new THREE.ConeGeometry(95, 70, 7)
  hillGeomB.computeVertexNormals()
  const hillGeomC = new THREE.ConeGeometry(60, 42, 5)
  hillGeomC.computeVertexNormals()

  const hillPositions: Array<{ pos: [number, number, number]; scale: number; geom: THREE.BufferGeometry; dark?: boolean }> = [
    // West distant hills (x: -180 to -450, along main straight)
    { pos: [-220, 27, -400], scale: 1.2, geom: hillGeomB },
    { pos: [-180, 20, -260], scale: 1.0, geom: hillGeomA, dark: true },
    { pos: [-240, 32, -120], scale: 1.4, geom: hillGeomB },
    { pos: [-190, 22, 20], scale: 0.9, geom: hillGeomC },
    { pos: [-250, 28, 180], scale: 1.1, geom: hillGeomA, dark: true },
    { pos: [-210, 25, 340], scale: 1.3, geom: hillGeomB },
    // East distant hills (behind grandstands: x: 220 to 380)
    { pos: [260, 30, -500], scale: 1.3, geom: hillGeomB },
    { pos: [220, 22, -320], scale: 1.0, geom: hillGeomA, dark: true },
    { pos: [280, 35, -160], scale: 1.5, geom: hillGeomB },
    { pos: [230, 24, 60], scale: 1.1, geom: hillGeomC },
    { pos: [270, 32, 240], scale: 1.4, geom: hillGeomB, dark: true },
    { pos: [210, 22, 420], scale: 0.9, geom: hillGeomA },
    // North Rettifilo backdrop hills (z: -850 to -1200)
    { pos: [-90, 35, -950], scale: 1.6, geom: hillGeomB },
    { pos: [80, 40, -1020], scale: 1.8, geom: hillGeomB, dark: true },
    { pos: [0, 28, -1150], scale: 1.4, geom: hillGeomA },
  ]

  for (const h of hillPositions) {
    const mat = h.dark ? materials.hillsDark : materials.hills
    const hillMesh = new THREE.Mesh(h.geom, mat)
    hillMesh.position.set(h.pos[0], h.pos[1], h.pos[2])
    hillMesh.scale.set(h.scale, h.scale, h.scale)
    hillMesh.rotation.y = (h.pos[2] * 0.1) % Math.PI
    hillMesh.castShadow = true
    hillMesh.receiveShadow = true
    group.add(hillMesh)
  }
  disposables.push(hillGeomA, hillGeomB, hillGeomC)

  // 3. Faceted Low-Poly Grey Boulders scattered along trackside verges
  const rockGeom = new THREE.DodecahedronGeometry(2.2, 0)
  rockGeom.computeVertexNormals()

  const boulderPlacements: Array<[number, number, number]> = [
    [-24, 1.2, -60],
    [-26, 1.5, -280],
    [24, 1.3, -200],
    [-28, 1.8, 120],
    [28, 1.4, 140],
    [-20, 1.5, -590],
    [22, 1.6, -710],
  ]

  for (const b of boulderPlacements) {
    const rockMesh = new THREE.Mesh(rockGeom, materials.rockGrey)
    rockMesh.position.set(b[0], b[1], b[2])
    rockMesh.rotation.set(0.2, (b[2] * 0.2) % Math.PI, 0.1)
    rockMesh.castShadow = true
    rockMesh.receiveShadow = true
    group.add(rockMesh)
  }
  disposables.push(rockGeom)

  // 4. Low-Poly Trackside Fence Posts & Horizontal Railings (matching reference fence line)
  const postGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 4)
  const fencePostsLeft = new THREE.InstancedMesh(postGeom, materials.fencePosts, 50)
  const fencePostsRight = new THREE.InstancedMesh(postGeom, materials.fencePosts, 50)
  const dummy = new THREE.Object3D()

  for (let i = 0; i < 50; i++) {
    const z = -350 + i * 16
    // Left fence (x: -12.5)
    dummy.position.set(-12.5, 0.9, z)
    dummy.updateMatrix()
    fencePostsLeft.setMatrixAt(i, dummy.matrix)

    // Right fence (x: 12.5)
    dummy.position.set(12.5, 0.9, z)
    dummy.updateMatrix()
    fencePostsRight.setMatrixAt(i, dummy.matrix)
  }
  fencePostsLeft.instanceMatrix.needsUpdate = true
  fencePostsRight.instanceMatrix.needsUpdate = true
  group.add(fencePostsLeft)
  group.add(fencePostsRight)
  disposables.push(postGeom, fencePostsLeft, fencePostsRight)

  // 5. Runoff Asphalt Aprons and Gravel Traps
  for (const r of runoffAreas) {
    const geom = new THREE.PlaneGeometry(r.width, r.length)
    const mat = r.type === 'gravel' ? materials.gravel : materials.runoffAsphalt
    const mesh = new THREE.Mesh(geom, mat)
    mesh.rotation.x = -Math.PI / 2
    if (r.rotationY) {
      mesh.rotation.z = r.rotationY
    }
    mesh.position.set(r.position[0], 0.005, r.position[2])
    mesh.receiveShadow = true
    group.add(mesh)
    disposables.push(geom)
  }

  // 6. Provisional Track Ribbon & Monza Kerb Bands (warm grey ribbon + muted red/white kerbs)
  const runwayGeom = new THREE.PlaneGeometry(16, 4000)
  const runwayMesh = new THREE.Mesh(runwayGeom, materials.runoffAsphalt)
  runwayMesh.rotation.x = -Math.PI / 2
  runwayMesh.position.set(0, 0.01, 0)
  runwayMesh.receiveShadow = true
  group.add(runwayMesh)
  disposables.push(runwayGeom)

  // Monza Kerb Stripes
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
        if ('dispose' in item && typeof item.dispose === 'function') {
          item.dispose()
        }
      }
    },
  }
}
