import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    camera.position.z = 3

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshNormalMaterial(),
    )
    scene.add(cube)

    const resize = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      cube.rotation.y += 0.01
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      cube.geometry.dispose()
      cube.material.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} />
}

export default App
