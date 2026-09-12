import type { CarConfig, CarState, CarTelemetry, SurfaceConfig, Vec2 } from './types.ts'

/**
 * Default Monza aerodynamic and powertrain trim:
 * Low drag, moderate downforce, peak power ~700 kW.
 */
export const MONZA_CONFIG: Readonly<CarConfig> = Object.freeze({
  mass: 780, // kg
  powerMax: 700_000, // W (wheel power)
  vStall: 10, // m/s
  cdA: 1.10, // m²
  clA: 3.0, // m²
  crr: 0.015, // dimensionless rolling resistance
  muAsphalt: 1.7, // asphalt friction coefficient
  brakeAccel: 50, // m/s² peak braking capability
  airDensity: 1.225, // kg/m³
  gravity: 9.81, // m/s²
  maxSteerRate: 1.8, // rad/s
  steerBlendSpeed: 2.5, // m/s
  reversePowerRatio: 0.25,
  maxReverseSpeed: 15, // m/s (~54 km/h)
})

export const DEFAULT_CAR_CONFIG = MONZA_CONFIG

/**
 * Standard track surface profiles.
 */
export const SURFACE_ASPHALT: Readonly<SurfaceConfig> = Object.freeze({
  mu: 1.7,
  rollingResistanceCoeff: 0.015,
  linearDrag: 0,
})

export const SURFACE_GRAVEL: Readonly<SurfaceConfig> = Object.freeze({
  mu: 0.75,
  rollingResistanceCoeff: 0.06,
  linearDrag: 35.0,
})

export const SURFACE_WET_ASPHALT: Readonly<SurfaceConfig> = Object.freeze({
  mu: 1.15,
  rollingResistanceCoeff: 0.018,
  linearDrag: 5.0,
})

export const DEFAULT_SURFACE = SURFACE_ASPHALT

/**
 * Default zero telemetry.
 */
export const ZERO_TELEMETRY: Readonly<CarTelemetry> = Object.freeze({
  longitudinalSpeed: 0,
  lateralSpeed: 0,
  speedKmH: 0,
  downforceN: 0,
  dragForceN: 0,
  normalLoadN: 780 * 9.81,
  frictionLimitN: 1.7 * 780 * 9.81,
  fLongN: 0,
  fLatN: 0,
  gripUtilization: 0,
  yawRate: 0,
  longitudinalAccel: 0,
  lateralAccel: 0,
})

/**
 * Creates a clean initial car state at specified position and heading.
 */
export function createInitialCarState(
  position: Vec2 = { x: 0, z: 0 },
  heading = 0,
): CarState {
  return {
    position: { x: position.x, z: position.z },
    velocity: { x: 0, z: 0 },
    heading,
    yawRate: 0,
    speed: 0,
    telemetry: {
      ...ZERO_TELEMETRY,
      normalLoadN: MONZA_CONFIG.mass * MONZA_CONFIG.gravity,
      frictionLimitN: MONZA_CONFIG.muAsphalt * MONZA_CONFIG.mass * MONZA_CONFIG.gravity,
    },
  }
}
