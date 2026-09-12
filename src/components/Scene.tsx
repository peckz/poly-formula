import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { buildCar } from '../game/carModel'
import { Keyboard } from '../game/input'
import { CarSim } from '../game/sim'
import { raceStore } from '../game/store'
import { buildTrack } from '../game/trackModel'
import { monzaPath } from '../game/trackPath'
import { trackingStore } from '../tracking/store'

const SKY = 0xa9c3e0
// Flip if the hand wheel steers the wrong way.
const WHEEL_STEER_SIGN = -1
// Hands on the wheel means go: there are no camera pedals yet.
const WHEEL_AUTO_THROTTLE = 0.65

function gearFor(speedKmh: number, speed: number): string {
  if (speed < -0.3) {
    return 'R'
  }
  if (speedKmh < 1) {
    return 'N'
  }
  return String(Math.min(8, 1 + Math.floor(speedKmh / 42)))
}

export function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(SKY)
    scene.fog = new THREE.Fog(SKY, 180, 620)

    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1200)

    scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x5c7a4a, 1.1))
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.6)
    sun.position.set(60, 90, 40)
    scene.add(sun)

    scene.add(buildTrack())

    const car = buildCar()
    scene.add(car.group)

    const sim = new CarSim()
    const keyboard = new Keyboard()
    keyboard.attach()

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

    const cameraTarget = new THREE.Vector3()
    let cameraReady = false
    let previous = performance.now()
    let frame = 0
    let resetHeld = false

    const animate = (now: number) => {
      frame = requestAnimationFrame(animate)
      const dt = Math.min((now - previous) / 1000, 0.05)
      previous = now

      const wheel = trackingStore.wheel
      const usingWheel = wheel.held && !wheel.grabbing
      let steer = keyboard.steer
      let throttle = keyboard.throttle
      const brake = keyboard.brake

      if (usingWheel && steer === 0) {
        steer = WHEEL_STEER_SIGN * wheel.steering
      }
      if (usingWheel && throttle === 0 && brake === 0) {
        throttle = WHEEL_AUTO_THROTTLE
      }

      if (keyboard.reset && !resetHeld) {
        sim.resetToTrack()
        cameraReady = false
      }
      resetHeld = keyboard.reset

      sim.step(dt, { throttle, brake, steer })

      car.group.position.set(sim.x, 0, sim.z)
      car.group.rotation.y = sim.heading
      car.group.rotation.z = sim.steer * Math.min(0.06, sim.speed * 0.002)

      for (const pivot of car.frontWheels) {
        pivot.rotation.y = sim.steer * 0.35
      }
      for (const tire of car.spinners) {
        tire.rotation.x -= (sim.speed / 0.34) * dt
      }

      // Chase camera: sit behind the car along its heading.
      const back = new THREE.Vector3(
        Math.sin(sim.heading),
        0,
        Math.cos(sim.heading),
      )
      const desired = new THREE.Vector3(sim.x, 0, sim.z)
        .addScaledVector(back, 9 + sim.speed * 0.03)
        .add(new THREE.Vector3(0, 3.4, 0))
      if (cameraReady) {
        camera.position.lerp(desired, Math.min(1, dt * 5))
      } else {
        camera.position.copy(desired)
        cameraReady = true
      }
      cameraTarget.set(sim.x, 1.1, sim.z).addScaledVector(back, -6)
      camera.lookAt(cameraTarget)

      const speedKmh = Math.round(Math.abs(sim.speed) * 3.6)
      const upcoming = monzaPath.nextCorner(sim.s)
      raceStore.update({
        speedKmh,
        gear: gearFor(speedKmh, sim.speed),
        lap: Math.max(1, sim.lap),
        steerSource: usingWheel ? 'wheel' : 'keys',
        offTrack: sim.offTrack,
        cornerName: upcoming.corner.name,
        cornerDistM: Math.round(upcoming.distance / 10) * 10,
        carX: Math.round(sim.x / 4) * 4,
        carZ: Math.round(sim.z / 4) * 4,
      })

      renderer.render(scene, camera)
    }
    frame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      keyboard.detach()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material]
          for (const material of materials) {
            if ('map' in material && material.map) {
              material.map.dispose()
            }
            material.dispose()
          }
        }
      })
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="scene-canvas" />
}
