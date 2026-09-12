import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { buildCar } from '../game/carModel'
import {
  allowedSpeed,
  buildSpeedEnvelope,
  speedControls,
} from '../game/driveAssist'
import { Keyboard } from '../game/input'
import { CarSim } from '../game/sim'
import { raceStore } from '../game/store'
import { buildTrack } from '../game/trackModel'
import { monzaPath } from '../game/trackPath'
import { trackingStore } from '../tracking/store'

const SKY = 0xa9c3e0
// Flip if the hand wheel steers the wrong way.
const WHEEL_STEER_SIGN = -1
// Hands must be gone this long before the game pauses, so a single
// dropped tracking frame does not stutter the race.
const PAUSE_GRACE_MS = 400
// Crawling in the grass (or lost deep in the scenery) this long puts the
// car back on the track with a rolling start.
const STUCK_MS = 2000
const STUCK_SPEED = 3
const LOST_DIST = 40
const RECOVER_SPEED = 12
// Boost charges while riding the green ghost line; auto-spends for pace.
const BOOST_LINE_M = 1.8
const BOOST_CHARGE_S = 5
const BOOST_DRAIN_S = 4
const BOOST_AUTO_MIN = 0.2

function gearFor(speedKmh: number): string {
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

    const track = buildTrack()
    scene.add(track.group)

    const car = buildCar()
    scene.add(car.group)

    const sim = new CarSim()
    const envelope = buildSpeedEnvelope(monzaPath)
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
    let phase: 'waiting' | 'running' | 'paused' = 'waiting'
    let wheelDriven = false
    let handsLostAt = 0
    let stuckSince = 0
    let boost = 0

    const animate = (now: number) => {
      frame = requestAnimationFrame(animate)
      const dt = Math.min((now - previous) / 1000, 0.05)
      previous = now

      const wheel = trackingStore.wheel
      const usingWheel = wheel.held && !wheel.grabbing
      const keysActive =
        keyboard.throttle > 0 || keyboard.brake > 0 || keyboard.steer !== 0

      // Start on a calibrated wheel grip (or keyboard as a fallback);
      // pause when a wheel-driven session loses both hands.
      if (usingWheel) {
        wheelDriven = true
      } else if (keysActive) {
        wheelDriven = false
      }
      if (phase !== 'running') {
        if (usingWheel || keysActive) {
          phase = 'running'
          handsLostAt = 0
        }
      } else if (wheelDriven && !wheel.held) {
        if (handsLostAt === 0) {
          handsLostAt = now
        } else if (now - handsLostAt > PAUSE_GRACE_MS) {
          phase = 'paused'
        }
      } else {
        handsLostAt = 0
      }
      raceStore.setPhase(phase)

      let steer = keyboard.steer
      let throttle = keyboard.throttle
      let brake = keyboard.brake
      let slowing = false
      let attacking = false

      if (usingWheel && steer === 0) {
        steer = WHEEL_STEER_SIGN * wheel.steering
      }

      // Wheel mode: pedals are fully automatic. Hands only steer.
      // Boost auto-spends whenever the meter has charge and we are not
      // mid-braking for a corner.
      if (usingWheel && !keysActive) {
        const spending = boost >= BOOST_AUTO_MIN
        const allowed = allowedSpeed({
          envelope,
          path: monzaPath,
          s: sim.s,
          distFromCenter: sim.distFromCenter,
          boost: spending ? boost : 0,
        })
        const pedals = speedControls({
          speed: sim.speed,
          allowed,
          offTrack: sim.offTrack,
        })
        throttle = pedals.throttle
        brake = pedals.brake
        slowing = brake > 0.12
        attacking = spending && !slowing
      }

      if (keyboard.reset && !resetHeld) {
        sim.resetToTrack()
        cameraReady = false
        boost = 0
      }
      resetHeld = keyboard.reset

      if (phase === 'running') {
        const boostThrust =
          usingWheel && attacking ? Math.min(1, boost * 1.2) : 0
        sim.step(dt, { throttle, brake, steer, boost: boostThrust })

        // Never leave the player beached: crawling off track (or fully
        // lost in the scenery) rolls the car back onto the centerline.
        const stuck =
          (sim.offTrack && sim.speed < STUCK_SPEED) ||
          sim.distFromCenter > LOST_DIST
        if (!stuck) {
          stuckSince = 0
        } else if (stuckSince === 0) {
          stuckSince = now
        } else if (now - stuckSince > STUCK_MS) {
          sim.resetToTrack()
          sim.speed = RECOVER_SPEED
          stuckSince = 0
        }
      }

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

      // Racing line glow + boost charge while riding it.
      const linePoint = track.racingLine.points[monzaPath.indexAt(sim.s)]
      const distToLine = Math.hypot(sim.x - linePoint.x, sim.z - linePoint.z)
      const onLine = distToLine < BOOST_LINE_M
      const lineOpacity = onLine ? 0.95 : 0.5
      track.racingLine.material.opacity +=
        (lineOpacity - track.racingLine.material.opacity) * Math.min(1, dt * 8)

      if (phase === 'running' && usingWheel) {
        if (attacking) {
          boost = Math.max(0, boost - dt / BOOST_DRAIN_S)
        } else if (onLine && !sim.offTrack) {
          boost = Math.min(1, boost + dt / BOOST_CHARGE_S)
        }
      }

      const speedKmh = Math.round(Math.abs(sim.speed) * 3.6)
      const { corner, distance } = monzaPath.nextCorner(sim.s)
      raceStore.update({
        speedKmh,
        gear: gearFor(speedKmh),
        lap: Math.max(1, sim.lap),
        steerSource: usingWheel ? 'wheel' : 'keys',
        offTrack: sim.offTrack,
        cornerName: corner.name,
        cornerDistM: Math.round(distance / 10) * 10,
        slowing,
        attacking,
        boost,
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
