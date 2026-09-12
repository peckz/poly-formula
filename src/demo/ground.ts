import * as THREE from 'three'
import { createMonzaTrackMeshGroup, monzaTrack } from '../tracks/monza'

/**
 * Creates the environment: Monza GP circuit ribbon, grass ground terrain,
 * ambient & sun lighting.
 */
export function createEnvironment(scene: THREE.Scene): { dispose: () => void } {
  const disposables: Array<{ dispose: () => void }> = []

  // 1. Surrounding ground terrain (large flat plane for Monza park backdrop)
  const groundGeom = new THREE.PlaneGeometry(6000, 6000)
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x182c18, // Monza park green
    roughness: 0.95,
    metalness: 0.0,
  })
  const groundMesh = new THREE.Mesh(groundGeom, groundMat)
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.position.set(440, -0.05, -550)
  groundMesh.receiveShadow = true
  scene.add(groundMesh)
  disposables.push(groundGeom, groundMat)

  // 2. Monza Track Meshes (Asphalt ribbon, F1 kerbs, aprons, start/finish line, corner markers)
  const trackGroup = createMonzaTrackMeshGroup(monzaTrack, {
    showApron: true,
    showKerbs: true,
    showCenterline: false,
    showCornerMarkers: true,
  })
  scene.add(trackGroup)

  // 3. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4)
  dirLight.position.set(400, 1000, 300)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 10
  dirLight.shadow.camera.far = 2500
  dirLight.shadow.camera.left = -600
  dirLight.shadow.camera.right = 600
  dirLight.shadow.camera.top = 600
  dirLight.shadow.camera.bottom = -600
  scene.add(dirLight)

  return {
    dispose() {
      for (const item of disposables) {
        if ('dispose' in item && typeof item.dispose === 'function') {
          item.dispose()
        }
      }
      trackGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            for (const mat of obj.material) {
              mat.dispose()
            }
          } else {
            obj.material.dispose()
          }
        }
      })
    },
  }
}
