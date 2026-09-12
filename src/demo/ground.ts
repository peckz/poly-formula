import * as THREE from 'three'

/**
 * Creates the environment ground: asphalt plane with high-contrast grid,
 * distance markers, and visual reference poles.
 */
export function createEnvironment(scene: THREE.Scene): { dispose: () => void } {
  const disposables: Array<{ dispose: () => void }> = []

  // 1. Procedural Asphalt Checkerboard/Grid Canvas Texture
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  // Base asphalt dark grey
  ctx.fillStyle = '#1e2229'
  ctx.fillRect(0, 0, 512, 512)

  // Inner tile
  ctx.fillStyle = '#232832'
  ctx.fillRect(4, 4, 248, 248)
  ctx.fillRect(260, 260, 248, 248)

  // Grid line accents
  ctx.strokeStyle = '#2f3747'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, 508, 508)

  const groundTexture = new THREE.CanvasTexture(canvas)
  groundTexture.wrapS = THREE.RepeatWrapping
  groundTexture.wrapT = THREE.RepeatWrapping
  // 1 tile = 10 metres, so repeat across 4000m = 400
  groundTexture.repeat.set(400, 400)
  groundTexture.anisotropy = 8

  const groundGeom = new THREE.PlaneGeometry(4000, 4000)
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTexture,
    roughness: 0.85,
    metalness: 0.1,
  })
  const groundMesh = new THREE.Mesh(groundGeom, groundMat)
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.position.y = 0
  groundMesh.receiveShadow = true
  scene.add(groundMesh)
  disposables.push(groundGeom, groundMat, groundTexture)

  // 2. Center Runway / Straight line markings (North-South main straight)
  const runwayGeom = new THREE.PlaneGeometry(24, 4000)
  const runwayMat = new THREE.MeshStandardMaterial({
    color: 0x181c22,
    roughness: 0.8,
  })
  const runwayMesh = new THREE.Mesh(runwayGeom, runwayMat)
  runwayMesh.rotation.x = -Math.PI / 2
  runwayMesh.position.y = 0.01
  scene.add(runwayMesh)
  disposables.push(runwayGeom, runwayMat)

  // Distance marker lines every 50m along main straight
  const lineGeom = new THREE.PlaneGeometry(20, 1.0)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })
  const lineInstanced = new THREE.InstancedMesh(lineGeom, lineMat, 80)
  lineInstanced.rotation.x = -Math.PI / 2
  const dummy = new THREE.Object3D()
  for (let i = 0; i < 80; i++) {
    const z = -2000 + i * 50
    dummy.position.set(0, z, 0.02)
    dummy.updateMatrix()
    lineInstanced.setMatrixAt(i, dummy.matrix)
  }
  lineInstanced.instanceMatrix.needsUpdate = true
  scene.add(lineInstanced)
  disposables.push(lineGeom, lineMat, lineInstanced)

  // 3. Grid Helper overlay for immediate spatial feedback
  const gridHelper = new THREE.GridHelper(4000, 400, 0x00f0ff, 0x2a364a)
  gridHelper.position.y = 0.03
  scene.add(gridHelper)
  disposables.push(gridHelper.geometry, gridHelper.material as THREE.Material)

  // 4. Perimeter marker cones/pillars to provide parallax depth
  const poleGeom = new THREE.CylinderGeometry(0.2, 0.2, 3.5, 8)
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.4 })
  const poleCount = 60
  const poleInstanced = new THREE.InstancedMesh(poleGeom, poleMat, poleCount)
  for (let i = 0; i < poleCount; i++) {
    const z = -1500 + i * 50
    const side = i % 2 === 0 ? -14 : 14
    dummy.position.set(side, 1.75, z)
    dummy.updateMatrix()
    poleInstanced.setMatrixAt(i, dummy.matrix)
  }
  poleInstanced.instanceMatrix.needsUpdate = true
  scene.add(poleInstanced)
  disposables.push(poleGeom, poleMat, poleInstanced)

  // 5. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xfffaed, 1.8)
  dirLight.position.set(40, 80, 50)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 10
  dirLight.shadow.camera.far = 200
  dirLight.shadow.camera.left = -50
  dirLight.shadow.camera.right = 50
  dirLight.shadow.camera.top = 50
  dirLight.shadow.camera.bottom = -50
  scene.add(dirLight)

  return {
    dispose() {
      for (const item of disposables) {
        if ('dispose' in item && typeof item.dispose === 'function') {
          item.dispose()
        }
      }
    },
  }
}
