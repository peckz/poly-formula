import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createMonzaTrackMeshGroup, monzaTrack } from '../tracks/monza'

export type ViewMode = 'full' | 'rettifilo' | 'parabolica' | 'perspective'

interface SceneProps {
  viewMode?: ViewMode
}

export function Scene({ viewMode = 'full' }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewModeRef = useRef<ViewMode>(viewMode)

  useEffect(() => {
    viewModeRef.current = viewMode
  }, [viewMode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111612) // Monza park dark tone

    // Sun / directional light & ambient lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2)
    sunLight.position.set(400, 1000, 300)
    scene.add(sunLight)

    // Build and add Monza Track
    const trackGroup = createMonzaTrackMeshGroup(monzaTrack, {
      showApron: true,
      showKerbs: true,
      showCenterline: false,
      showCornerMarkers: true,
    })
    scene.add(trackGroup)

    // Surrounding ground terrain (large flat plane for Monza park backdrop)
    const groundGeo = new THREE.PlaneGeometry(5000, 5000)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x182c18, // Deep park green
      roughness: 0.95,
      metalness: 0.0,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.set(460, -0.1, -560)
    scene.add(ground)

    // Cameras: Orthographic for top-down vibe checks and perspective
    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10000)
    const perspectiveCamera = new THREE.PerspectiveCamera(60, 1, 1, 10000)

    const updateCameraView = () => {
      const width = canvas.clientWidth || 1920
      const height = canvas.clientHeight || 1080
      const aspect = width / Math.max(height, 1)

      renderer.setSize(width, height, false)

      const mode = viewModeRef.current

      if (mode === 'full') {
        // Whole circuit top-down orthographic
        const viewHeight = 1750
        const viewWidth = viewHeight * aspect
        orthoCamera.left = -viewWidth / 2
        orthoCamera.right = viewWidth / 2
        orthoCamera.top = viewHeight / 2
        orthoCamera.bottom = -viewHeight / 2
        orthoCamera.position.set(440, 2000, -555)
        orthoCamera.lookAt(440, 0, -555)
        orthoCamera.updateProjectionMatrix()
      } else if (mode === 'rettifilo') {
        // Zoomed top-down on Variante del Rettifilo (T1-T2)
        const viewHeight = 220
        const viewWidth = viewHeight * aspect
        orthoCamera.left = -viewWidth / 2
        orthoCamera.right = viewWidth / 2
        orthoCamera.top = viewHeight / 2
        orthoCamera.bottom = -viewHeight / 2
        orthoCamera.position.set(22, 1000, -1070)
        orthoCamera.lookAt(22, 0, -1070)
        orthoCamera.updateProjectionMatrix()
      } else if (mode === 'parabolica') {
        // Zoomed top-down on Curva Parabolica / Alboreto (T11)
        const viewHeight = 460
        const viewWidth = viewHeight * aspect
        orthoCamera.left = -viewWidth / 2
        orthoCamera.right = viewWidth / 2
        orthoCamera.top = viewHeight / 2
        orthoCamera.bottom = -viewHeight / 2
        orthoCamera.position.set(-85, 1000, 70)
        orthoCamera.lookAt(-85, 0, 70)
        orthoCamera.updateProjectionMatrix()
      } else {
        // Perspective angle
        perspectiveCamera.aspect = aspect
        perspectiveCamera.position.set(0, 150, 450)
        perspectiveCamera.lookAt(0, 0, -200)
        perspectiveCamera.updateProjectionMatrix()
      }
    }

    const observer = new ResizeObserver(updateCameraView)
    observer.observe(canvas)
    updateCameraView()

    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      updateCameraView()
      const activeCamera =
        viewModeRef.current === 'perspective'
          ? perspectiveCamera
          : orthoCamera
      renderer.render(scene, activeCamera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
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
      groundGeo.dispose()
      groundMat.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="scene-canvas" />
}
