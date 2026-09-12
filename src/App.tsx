import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { CameraView } from './components/CameraView'
import { TrackingHud } from './components/TrackingHud'
import { createCarMesh } from './demo/carMesh'
import { createEnvironment } from './demo/ground'
import { createInputController } from './demo/input'
import {
  DEFAULT_CAR_CONFIG,
  SURFACE_ASPHALT,
  SURFACE_GRAVEL,
  SURFACE_WET_ASPHALT,
  createInitialCarState,
} from './physics/defaults'
import { PhysicsAccumulator } from './physics/loop'
import { stepCar } from './physics/step'
import type {
  CarConfig,
  CarInputs,
  CarState,
  SurfaceConfig,
} from './physics/types'

type CameraMode = 'chase' | 'topDown'
type SurfaceName = 'asphalt' | 'gravel' | 'wet'

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Physics tuning state (defaults to Monza trim)
  const [carConfig, setCarConfig] = useState<CarConfig>({
    ...DEFAULT_CAR_CONFIG,
  })
  const [surfaceName, setSurfaceName] = useState<SurfaceName>('asphalt')
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase')
  const [showTuning, setShowTuning] = useState(false)
  const [showCameraTracking, setShowCameraTracking] = useState(true)

  // Live HUD metrics
  const [hudState, setHudState] = useState({
    speedKmH: 0,
    speedMs: 0,
    throttle: 0,
    brake: 0,
    steer: 0,
    downforceN: 0,
    dragForceN: 0,
    frictionLimitN: 0,
    fLongN: 0,
    fLatN: 0,
    gripUtilization: 0,
    longAccelG: 0,
    latAccelG: 0,
  })

  // Derive active surface config
  const activeSurface: SurfaceConfig =
    surfaceName === 'asphalt'
      ? SURFACE_ASPHALT
      : surfaceName === 'gravel'
        ? SURFACE_GRAVEL
        : SURFACE_WET_ASPHALT

  // Refs for current tuning and surface so the animation loop always has fresh values
  const configRef = useRef(carConfig)
  const surfaceRef = useRef(activeSurface)
  const cameraModeRef = useRef(cameraMode)

  useEffect(() => {
    configRef.current = carConfig
    surfaceRef.current = activeSurface
    cameraModeRef.current = cameraMode
  }, [carConfig, activeSurface, cameraMode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    // 1. Scene & Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d1117)
    scene.fog = new THREE.FogExp2(0x0d1117, 0.0018)

    const camera = new THREE.PerspectiveCamera(65, 1, 0.2, 2000)

    // 2. Add Environment and Car Mesh
    const env = createEnvironment(scene)
    const carMesh = createCarMesh()
    scene.add(carMesh)

    // 3. Physics & Input Loop State
    const accumulator = new PhysicsAccumulator({
      fixedDt: 1 / 120,
      maxSubSteps: 6,
    })
    let carState: CarState = createInitialCarState({ x: 0, z: 0 }, 0)
    const inputController = createInputController(window)

    // Smooth camera tracking vectors
    const cameraCurrentPos = new THREE.Vector3(0, 4, 10)
    const cameraTargetLookAt = new THREE.Vector3(0, 0, 0)

    // Responsive Canvas Resize
    const resize = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (width === 0 || height === 0) {
        return
      }
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    // 4. Key listener for shortcut toggles: [C] Camera, [G] Surface, [T] Tracking UI
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) {
        return
      }
      if (e.code === 'KeyC') {
        setCameraMode((prev) => (prev === 'chase' ? 'topDown' : 'chase'))
      } else if (e.code === 'KeyG') {
        setSurfaceName((prev) => {
          if (prev === 'asphalt') {
            return 'gravel'
          }
          if (prev === 'gravel') {
            return 'wet'
          }
          return 'asphalt'
        })
      } else if (e.code === 'KeyT') {
        setShowCameraTracking((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    // 5. Main Animation & Physics Loop
    let lastTime = performance.now()
    let animationFrameId = 0
    let hudUpdateTimer = 0
    let lastInputs: CarInputs = { throttle: 0, brake: 0, steer: 0 }

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate)

      const deltaSeconds = Math.max(0, (currentTime - lastTime) / 1000)
      lastTime = currentTime

      // Reset check
      if (inputController.consumeReset()) {
        carState = createInitialCarState({ x: 0, z: 0 }, 0)
        accumulator.reset()
      }

      // Physics integration over fixedDt sub-steps
      accumulator.advance(deltaSeconds, (dt) => {
        lastInputs = inputController.getInputs(
          carState.telemetry.longitudinalSpeed,
        )
        carState = stepCar(
          carState,
          lastInputs,
          configRef.current,
          surfaceRef.current,
          dt,
        )
      })

      // Sync 3D Mesh pose from physics state
      carMesh.position.set(carState.position.x, 0, carState.position.z)
      carMesh.rotation.y = carState.heading

      // Camera Position & Tracking
      const sinH = Math.sin(carState.heading)
      const cosH = Math.cos(carState.heading)
      const fwdX = sinH
      const fwdZ = -cosH

      if (cameraModeRef.current === 'chase') {
        // Smooth dynamic chase camera behind the car
        const speedRatio = Math.min(carState.speed / 80, 1.0)
        const chaseDist = 8.0 + speedRatio * 3.0 // camera pulls back slightly at 300+ km/h
        const chaseHeight = 2.8 + speedRatio * 0.8

        const targetCamX = carState.position.x - fwdX * chaseDist
        const targetCamZ = carState.position.z - fwdZ * chaseDist
        const targetCamY = chaseHeight

        const lerpFactor = Math.min(1.0, deltaSeconds * 8.0)
        cameraCurrentPos.x += (targetCamX - cameraCurrentPos.x) * lerpFactor
        cameraCurrentPos.y += (targetCamY - cameraCurrentPos.y) * lerpFactor
        cameraCurrentPos.z += (targetCamZ - cameraCurrentPos.z) * lerpFactor

        camera.position.copy(cameraCurrentPos)

        // Look slightly ahead of the car nose
        const lookAheadDist = 6.0 + speedRatio * 8.0
        const targetLookX = carState.position.x + fwdX * lookAheadDist
        const targetLookZ = carState.position.z + fwdZ * lookAheadDist
        const targetLookY = 0.6

        cameraTargetLookAt.x +=
          (targetLookX - cameraTargetLookAt.x) * lerpFactor
        cameraTargetLookAt.y +=
          (targetLookY - cameraTargetLookAt.y) * lerpFactor
        cameraTargetLookAt.z +=
          (targetLookZ - cameraTargetLookAt.z) * lerpFactor

        camera.lookAt(cameraTargetLookAt)
      } else {
        // Top-Down Bird's Eye View
        const topHeight = 55.0
        camera.position.set(
          carState.position.x,
          topHeight,
          carState.position.z + 0.1,
        )
        camera.lookAt(carState.position.x, 0, carState.position.z)
      }

      renderer.render(scene, camera)

      // Throttle HUD updates to ~30 fps for smooth DOM performance
      hudUpdateTimer += deltaSeconds
      if (hudUpdateTimer >= 0.033) {
        hudUpdateTimer = 0
        setHudState({
          speedKmH: Math.round(carState.telemetry.speedKmH),
          speedMs: Number(carState.speed.toFixed(1)),
          throttle: lastInputs.throttle,
          brake: lastInputs.brake,
          steer: lastInputs.steer,
          downforceN: Math.round(carState.telemetry.downforceN),
          dragForceN: Math.round(carState.telemetry.dragForceN),
          frictionLimitN: Math.round(carState.telemetry.frictionLimitN),
          fLongN: Math.round(carState.telemetry.fLongN),
          fLatN: Math.round(carState.telemetry.fLatN),
          gripUtilization: Math.round(
            carState.telemetry.gripUtilization * 100,
          ),
          longAccelG: Number(
            (carState.telemetry.longitudinalAccel / 9.81).toFixed(2),
          ),
          latAccelG: Number(
            (carState.telemetry.lateralAccel / 9.81).toFixed(2),
          ),
        })
      }
    }

    animationFrameId = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      window.removeEventListener('keydown', handleKeyDown)
      inputController.dispose()
      env.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div className="game-container">
      <canvas ref={canvasRef} className="scene-canvas" />

      {/* MediaPipe Camera View & Tracking HUD */}
      {showCameraTracking && (
        <>
          <CameraView />
          <TrackingHud />
        </>
      )}

      {/* Header Info */}
      <div className="hud-panel hud-header">
        <h1 className="hud-title">Poly Formula</h1>
        <span className="hud-badge">Physics v1 (Monza Trim)</span>
        <button
          className="hud-tuning-btn"
          onClick={() => setShowTuning((prev) => !prev)}
        >
          {showTuning ? 'Hide Tuning' : '⚙ Tuning Knobs'}
        </button>
        <button
          className="hud-tuning-btn"
          onClick={() => setShowCameraTracking((prev) => !prev)}
        >
          {showCameraTracking ? 'Hide Tracking' : '📷 Show Tracking'}
        </button>
      </div>

      {/* Interactive Physics Tuning Drawer */}
      {showTuning && (
        <div className="hud-panel hud-tuning-drawer">
          <div style={{ fontWeight: 700, color: '#00f0ff', marginBottom: 4 }}>
            Aero & Powertrain Knobs
          </div>

          <div className="hud-slider-group">
            <div className="hud-slider-label">
              <span>CdA (Drag Area)</span>
              <span>{carConfig.cdA.toFixed(2)} m²</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              className="hud-slider"
              value={carConfig.cdA}
              onChange={(e) =>
                setCarConfig((c) => ({
                  ...c,
                  cdA: Number.parseFloat(e.target.value),
                }))
              }
            />
          </div>

          <div className="hud-slider-group">
            <div className="hud-slider-label">
              <span>ClA (Downforce Area)</span>
              <span>{carConfig.clA.toFixed(2)} m²</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="6.0"
              step="0.1"
              className="hud-slider"
              value={carConfig.clA}
              onChange={(e) =>
                setCarConfig((c) => ({
                  ...c,
                  clA: Number.parseFloat(e.target.value),
                }))
              }
            />
          </div>

          <div className="hud-slider-group">
            <div className="hud-slider-label">
              <span>Power (Wheel)</span>
              <span>{Math.round(carConfig.powerMax / 1000)} kW</span>
            </div>
            <input
              type="range"
              min="300000"
              max="1000000"
              step="25000"
              className="hud-slider"
              value={carConfig.powerMax}
              onChange={(e) =>
                setCarConfig((c) => ({
                  ...c,
                  powerMax: Number.parseFloat(e.target.value),
                }))
              }
            />
          </div>

          <div className="hud-slider-group">
            <div className="hud-slider-label">
              <span>Tire Peak Mu (Asphalt)</span>
              <span>{carConfig.muAsphalt.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.05"
              className="hud-slider"
              value={carConfig.muAsphalt}
              onChange={(e) =>
                setCarConfig((c) => ({
                  ...c,
                  muAsphalt: Number.parseFloat(e.target.value),
                }))
              }
            />
          </div>

          <button
            className="hud-tuning-btn"
            style={{ marginTop: 8 }}
            onClick={() => setCarConfig({ ...DEFAULT_CAR_CONFIG })}
          >
            Reset to Monza Trim Defaults
          </button>
        </div>
      )}

      {/* Controls Guide */}
      <div className="hud-panel hud-controls">
        <div className="hud-control-item">
          <span className="hud-key">W / ↑</span> Throttle
        </div>
        <div className="hud-control-item">
          <span className="hud-key">S / ↓</span> Brake / Reverse
        </div>
        <div className="hud-control-item">
          <span className="hud-key">A / D / ← / →</span> Steer
        </div>
        <div className="hud-control-item">
          <span className="hud-key">Space</span> Full Brake
        </div>
        <div className="hud-control-item">
          <span className="hud-key">R</span> Reset Car
        </div>
        <div className="hud-control-item">
          <span className="hud-key">C</span> Camera ({cameraMode})
        </div>
        <div className="hud-control-item">
          <span className="hud-key">G</span> Surface ({surfaceName})
        </div>
        <div className="hud-control-item">
          <span className="hud-key">T</span> Toggle Tracking UI
        </div>
      </div>

      {/* Telemetry Panel */}
      <div className="hud-panel hud-telemetry">
        <div style={{ fontWeight: 700, color: '#00f0ff', marginBottom: 4 }}>
          Telemetry & Forces
        </div>
        <div className="hud-telemetry-row">
          <span>Surface</span>
          <span
            className="hud-telemetry-val"
            style={{ textTransform: 'capitalize' }}
          >
            {surfaceName} (μ={activeSurface.mu})
          </span>
        </div>
        <div className="hud-telemetry-row">
          <span>Aero Downforce</span>
          <span className="hud-telemetry-val">{hudState.downforceN} N</span>
        </div>
        <div className="hud-telemetry-row">
          <span>Aero Drag</span>
          <span className="hud-telemetry-val">{hudState.dragForceN} N</span>
        </div>
        <div className="hud-telemetry-row">
          <span>Tire F_max</span>
          <span className="hud-telemetry-val">
            {hudState.frictionLimitN} N
          </span>
        </div>
        <div className="hud-telemetry-row">
          <span>Long / Lat Force</span>
          <span className="hud-telemetry-val">
            {hudState.fLongN} / {hudState.fLatN} N
          </span>
        </div>
        <div className="hud-telemetry-row">
          <span>Grip Utilization</span>
          <span
            className="hud-telemetry-val"
            style={{
              color: hudState.gripUtilization > 90 ? '#ff453a' : '#39d353',
            }}
          >
            {hudState.gripUtilization}%
          </span>
        </div>
        <div className="hud-telemetry-row">
          <span>Long / Lat G</span>
          <span className="hud-telemetry-val">
            {hudState.longAccelG > 0
              ? `+${hudState.longAccelG}`
              : hudState.longAccelG}{' '}
            g / {hudState.latAccelG} g
          </span>
        </div>
      </div>

      {/* Speedometer & Input Pedal Meters */}
      <div className="hud-panel hud-cluster">
        <div className="hud-speed-value">{hudState.speedKmH}</div>
        <div className="hud-speed-unit">KM/H &bull; {hudState.speedMs} M/S</div>

        <div className="hud-pedals">
          <div className="hud-pedal-row">
            <span className="hud-pedal-label">THR</span>
            <div className="hud-pedal-bar-bg">
              <div
                className="hud-pedal-bar-fill throttle"
                style={{ width: `${hudState.throttle * 100}%` }}
              />
            </div>
          </div>
          <div className="hud-pedal-row">
            <span className="hud-pedal-label">BRK</span>
            <div className="hud-pedal-bar-bg">
              <div
                className="hud-pedal-bar-fill brake"
                style={{ width: `${hudState.brake * 100}%` }}
              />
            </div>
          </div>
          <div className="hud-pedal-row">
            <span className="hud-pedal-label">STR</span>
            <div
              className="hud-pedal-bar-bg"
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                className="hud-pedal-bar-fill steer"
                style={{
                  width: `${Math.abs(hudState.steer) * 50}%`,
                  transform:
                    hudState.steer < 0
                      ? 'translateX(-50%)'
                      : 'translateX(50%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
