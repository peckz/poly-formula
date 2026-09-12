import { DEFAULT_CAR_CONFIG, DEFAULT_SURFACE } from './defaults.ts'
import type {
  CarConfig,
  CarInputs,
  CarState,
  CarTelemetry,
  SurfaceConfig,
  Vec2,
} from './types.ts'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Pure function that integrates the vehicle physics by fixed timestep dt.
 *
 * Physics Model:
 * - Point-mass representation with heading (yaw angle)
 * - Powertrain thrust with stall speed virtual gear ratio
 * - Aerodynamic drag (CdA) and downforce (ClA)
 * - Tire friction limit F_max = mu * (m*g + F_down)
 * - Friction ellipse: (F_long/F_max)² + (F_lat/F_max)² <= 1 (cuts longitudinal first)
 * - Speed-limited steering authority with low-speed blend
 * - Semi-implicit Euler integration: v(t+dt) = v(t) + a*dt; x(t+dt) = x(t) + v(t+dt)*dt
 */
export function stepCar(
  state: CarState,
  inputs: CarInputs,
  config: CarConfig = DEFAULT_CAR_CONFIG,
  surface: SurfaceConfig = DEFAULT_SURFACE,
  dt = 1 / 120,
): CarState {
  const m = config.mass
  const g = config.gravity
  const rho = config.airDensity

  // 1. Current velocity and speed decomposition
  const vx = state.velocity.x
  const vz = state.velocity.z
  const speed = Math.hypot(vx, vz)

  // Current forward unit vectors (0 heading is -Z / north)
  const sinH = Math.sin(state.heading)
  const cosH = Math.cos(state.heading)
  const uFwdX = sinH
  const uFwdZ = -cosH

  const vLong = vx * uFwdX + vz * uFwdZ

  // 2. Normal load & grip capacity (including aero downforce)
  // F_down = 0.5 * rho * ClA * v²
  const downforceN = 0.5 * rho * config.clA * speed * speed
  const normalLoadN = m * g + downforceN
  const frictionLimitN = surface.mu * normalLoadN

  // 3. Steering and yaw rate dynamics
  // Speed-limited authority: at high speeds, lateral grip caps yaw rate
  const lowSpeedFactor = clamp(
    speed / Math.max(config.steerBlendSpeed, 0.01),
    0,
    1,
  )
  const gripLimitedYawRate =
    (surface.mu * (g + downforceN / m)) / Math.max(speed, 1.0)
  const maxAllowedYawRate = Math.min(config.maxSteerRate, gripLimitedYawRate)

  // Normalize steer input [-1, 1]
  const rawSteer = clamp(inputs.steer, -1, 1)
  // Reversing inverts the steering direction
  let steerSign = 1
  if (vLong < -0.2) {
    steerSign = -1
  }
  const yawRate = rawSteer * steerSign * maxAllowedYawRate * lowSpeedFactor

  // Integrate heading
  const nextHeading = state.heading + yawRate * dt

  // New heading unit vectors
  const nextSinH = Math.sin(nextHeading)
  const nextCosH = Math.cos(nextHeading)
  const nextUFwdX = nextSinH
  const nextUFwdZ = -nextCosH
  const nextURightX = nextCosH
  const nextURightZ = nextSinH

  // Velocity components relative to the newly steered vehicle frame
  const frameVLat = vx * nextURightX + vz * nextURightZ

  // 4. Lateral force demand to cancel side slip (tracking the heading)
  const tauLat = Math.max(dt, 0.01)
  const fLatDemand = -m * (frameVLat / tauLat)
  const fLat = clamp(fLatDemand, -frictionLimitN, frictionLimitN)

  // 5. Friction ellipse: (F_long / F_max)² + (F_lat / F_max)² <= 1
  // On saturate, cut longitudinal first!
  const remainingLongGripRatio = Math.max(0, 1 - (fLat / frictionLimitN) ** 2)
  const maxFLong = frictionLimitN * Math.sqrt(remainingLongGripRatio)

  // 6. Longitudinal forces (Thrust, Brake, Reverse)
  const throttleInput = clamp(inputs.throttle, 0, 1)
  const brakeInput = clamp(inputs.brake, 0, 1)
  const reverseInput = inputs.reverse ? clamp(inputs.reverse, 0, 1) : 0

  let fLongDemand = 0

  // Forward thrust: P_max * throttle / max(speed, vStall)
  if (throttleInput > 0) {
    const effectiveSpeed = Math.max(speed, config.vStall)
    fLongDemand += throttleInput * (config.powerMax / effectiveSpeed)
  }

  // Reverse thrust: explicit reverse input or reverse gear
  if (reverseInput > 0 && vLong > -config.maxReverseSpeed) {
    const revPower = config.powerMax * config.reversePowerRatio
    const effectiveSpeed = Math.max(speed, config.vStall)
    fLongDemand -= reverseInput * (revPower / effectiveSpeed)
  }

  // Friction braking: opposes direction of travel to bring vehicle to standstill
  if (brakeInput > 0) {
    const peakBrakeForce = m * config.brakeAccel
    const brakeForce = brakeInput * peakBrakeForce
    if (vLong > 1e-3) {
      const maxBrakeToStop = (m * vLong) / dt
      fLongDemand -= Math.min(brakeForce, maxBrakeToStop)
    } else if (vLong < -1e-3) {
      const maxBrakeToStop = (m * -vLong) / dt
      fLongDemand += Math.min(brakeForce, maxBrakeToStop)
    }
  }

  // Apply friction ellipse saturation constraint
  const fLong = clamp(fLongDemand, -maxFLong, maxFLong)

  // 7. Total tire force in world coordinates
  const fTireX = fLong * nextUFwdX + fLat * nextURightX
  const fTireZ = fLong * nextUFwdZ + fLat * nextURightZ

  // 8. Environmental resistances (Aero Drag, Rolling Resistance, Surface Linear Drag)
  // Drag = 0.5 * rho * CdA * v² (opposes velocity vector)
  const aeroDragCoeff = 0.5 * rho * config.cdA
  const fDragMag = aeroDragCoeff * speed * speed
  let fDragX = 0
  let fDragZ = 0
  if (speed > 1e-4) {
    fDragX = -fDragMag * (vx / speed)
    fDragZ = -fDragMag * (vz / speed)
  }

  // Rolling resistance: Crr * m * g (opposes velocity)
  const fRollMag = surface.rollingResistanceCoeff * m * g
  let fRollX = 0
  let fRollZ = 0
  if (speed > 1e-3) {
    const maxRollForce = (m * speed) / dt
    const effectiveRoll = Math.min(fRollMag, maxRollForce)
    fRollX = -effectiveRoll * (vx / speed)
    fRollZ = -effectiveRoll * (vz / speed)
  }

  // Linear drag stub (e.g. gravel resistance)
  const fLinearDragX = -surface.linearDrag * vx
  const fLinearDragZ = -surface.linearDrag * vz

  // 9. Total net force & acceleration
  const fTotalX = fTireX + fDragX + fRollX + fLinearDragX
  const fTotalZ = fTireZ + fDragZ + fRollZ + fLinearDragZ

  const accelX = fTotalX / m
  const accelZ = fTotalZ / m

  // 10. Semi-implicit Euler integration: v(t+dt) then x(t+dt)
  let nextVx = vx + accelX * dt
  let nextVz = vz + accelZ * dt

  // Standstill snap: prevent tiny numerical drift when stopped with no inputs
  const rawNextSpeed = Math.hypot(nextVx, nextVz)
  if (
    rawNextSpeed < 0.005 &&
    throttleInput === 0 &&
    brakeInput === 0 &&
    reverseInput === 0
  ) {
    nextVx = 0
    nextVz = 0
  }

  const nextSpeed = Math.hypot(nextVx, nextVz)
  const nextPosition: Vec2 = {
    x: state.position.x + nextVx * dt,
    z: state.position.z + nextVz * dt,
  }

  // 11. Compute Telemetry
  const nextVLong = nextVx * nextUFwdX + nextVz * nextUFwdZ
  const nextVLat = nextVx * nextURightX + nextVz * nextURightZ
  const gripUtilization = Math.min(
    1,
    Math.hypot(fLong / frictionLimitN, fLat / frictionLimitN),
  )

  const longitudinalAccel = accelX * nextUFwdX + accelZ * nextUFwdZ
  const lateralAccel = accelX * nextURightX + accelZ * nextURightZ

  const telemetry: CarTelemetry = {
    longitudinalSpeed: nextVLong,
    lateralSpeed: nextVLat,
    speedKmH: nextSpeed * 3.6,
    downforceN,
    dragForceN: fDragMag,
    normalLoadN,
    frictionLimitN,
    fLongN: fLong,
    fLatN: fLat,
    gripUtilization,
    yawRate,
    longitudinalAccel,
    lateralAccel,
  }

  return {
    position: nextPosition,
    velocity: { x: nextVx, z: nextVz },
    heading: nextHeading,
    yawRate,
    speed: nextSpeed,
    telemetry,
  }
}
