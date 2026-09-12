import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MONZA_CONFIG,
  SURFACE_ASPHALT,
  SURFACE_GRAVEL,
  createInitialCarState,
} from './defaults.ts'
import { stepCar } from './step.ts'
import { PhysicsAccumulator } from './loop.ts'
import type { CarInputs } from './types.ts'

test('Initial state has zero velocity and correct normal load', () => {
  const state = createInitialCarState({ x: 10, z: 20 }, 0)
  assert.equal(state.position.x, 10)
  assert.equal(state.position.z, 20)
  assert.equal(state.velocity.x, 0)
  assert.equal(state.velocity.z, 0)
  assert.equal(state.speed, 0)
  const expectedNormal = MONZA_CONFIG.mass * MONZA_CONFIG.gravity
  assert.ok(Math.abs(state.telemetry.normalLoadN - expectedNormal) < 1e-3)
})

test('Thrust from standstill is limited by tire friction F_max', () => {
  const state0 = createInitialCarState()
  const inputs: CarInputs = { throttle: 1, brake: 0, steer: 0 }
  const dt = 1 / 120

  const state1 = stepCar(state0, inputs, MONZA_CONFIG, SURFACE_ASPHALT, dt)

  // Standstill F_max = mu * m * g
  const fMaxStandstill = MONZA_CONFIG.muAsphalt * MONZA_CONFIG.mass * MONZA_CONFIG.gravity
  assert.ok(state1.telemetry.fLongN <= fMaxStandstill + 1e-3)
  assert.ok(state1.telemetry.fLongN > 10000, `fLongN should be high, got ${state1.telemetry.fLongN}`)
  assert.ok(state1.speed > 0)
  // Direction should be forward (-Z)
  assert.ok(state1.velocity.z < 0)
  assert.equal(state1.velocity.x, 0)
})

test('Aero drag limits top speed roughly in the 300+ km/h ballpark on a long full-throttle run', () => {
  let state = createInitialCarState()
  const inputs: CarInputs = { throttle: 1, brake: 0, steer: 0 }
  const dt = 1 / 120

  // Simulate 30 seconds of full throttle
  const totalSteps = 30 * 120
  for (let i = 0; i < totalSteps; i++) {
    state = stepCar(state, inputs, MONZA_CONFIG, SURFACE_ASPHALT, dt)
  }

  const speedKmH = state.speed * 3.6
  // Theoretical terminal velocity where P_max / v = 0.5 * rho * CdA * v² + Crr*m*g is ~360 km/h (100 m/s)
  assert.ok(
    speedKmH >= 340 && speedKmH <= 380,
    `Expected top speed in 340-380 km/h range, got ${speedKmH.toFixed(1)} km/h`,
  )

  // Verify downforce scales quadratically with speed
  const expectedDownforce = 0.5 * MONZA_CONFIG.airDensity * MONZA_CONFIG.clA * state.speed * state.speed
  assert.ok(Math.abs(state.telemetry.downforceN - expectedDownforce) < 1.0)
})

test('Braking decelerates the vehicle rapidly without reversing past zero', () => {
  // Accelerate to ~100 km/h (~27.8 m/s)
  let state = createInitialCarState()
  const throttleInputs: CarInputs = { throttle: 1, brake: 0, steer: 0 }
  const dt = 1 / 120

  for (let i = 0; i < 240; i++) {
    state = stepCar(state, throttleInputs, MONZA_CONFIG, SURFACE_ASPHALT, dt)
  }
  const speedBeforeBraking = state.speed
  assert.ok(speedBeforeBraking > 20, `Speed should be high, got ${speedBeforeBraking}`)

  // Apply full brake for 2.5 seconds (300 steps)
  const brakeInputs: CarInputs = { throttle: 0, brake: 1, steer: 0 }
  for (let i = 0; i < 300; i++) {
    state = stepCar(state, brakeInputs, MONZA_CONFIG, SURFACE_ASPHALT, dt)
  }

  // Should have reached standstill and not accelerated backwards
  assert.ok(state.speed < 0.1, `Car should be stopped, got ${state.speed}`)
  assert.ok(state.velocity.z <= 0.01 && state.velocity.z >= -0.01)
})

test('Friction ellipse cuts longitudinal force when saturated by lateral cornering', () => {
  // Give car forward velocity of 40 m/s
  let state = createInitialCarState()
  state.velocity = { x: 0, z: -40 }
  state.speed = 40

  const dt = 1 / 120
  // Hard steer right while holding full throttle
  const turnInputs: CarInputs = { throttle: 1, brake: 0, steer: 1 }
  const nextState = stepCar(state, turnInputs, MONZA_CONFIG, SURFACE_ASPHALT, dt)

  // Lateral force should be non-zero
  assert.ok(Math.abs(nextState.telemetry.fLatN) > 0)
  // Ellipse constraint: (fLong/fMax)² + (fLat/fMax)² <= 1.0001
  const fMax = nextState.telemetry.frictionLimitN
  const ellipseValue =
    (nextState.telemetry.fLongN / fMax) ** 2 +
    (nextState.telemetry.fLatN / fMax) ** 2
  assert.ok(
    ellipseValue <= 1.0001,
    `Ellipse constraint violated: ${ellipseValue}`,
  )
})

test('Gravel surface exhibits lower grip and higher resistance', () => {
  let asphaltState = createInitialCarState()
  let gravelState = createInitialCarState()
  const inputs: CarInputs = { throttle: 1, brake: 0, steer: 0 }
  const dt = 1 / 120

  for (let i = 0; i < 120; i++) {
    asphaltState = stepCar(asphaltState, inputs, MONZA_CONFIG, SURFACE_ASPHALT, dt)
    gravelState = stepCar(gravelState, inputs, MONZA_CONFIG, SURFACE_GRAVEL, dt)
  }

  assert.ok(
    asphaltState.speed > gravelState.speed,
    `Asphalt (${asphaltState.speed.toFixed(1)}) should accelerate faster than gravel (${gravelState.speed.toFixed(1)})`,
  )
  assert.ok(gravelState.telemetry.frictionLimitN < asphaltState.telemetry.frictionLimitN)
})

test('PhysicsAccumulator executes fixed sub-steps and clamps delta', () => {
  const accumulator = new PhysicsAccumulator({ fixedDt: 1 / 120, maxSubSteps: 6 })
  let stepCount = 0

  // 1/60 frame delta should trigger 2 ticks of 1/120
  const steps1 = accumulator.advance(1 / 60, () => {
    stepCount++
  })
  assert.equal(steps1, 2)
  assert.equal(stepCount, 2)

  // Huge stall (e.g. 1.0s) should be clamped to maxSubSteps (6)
  const steps2 = accumulator.advance(1.0, () => {
    stepCount++
  })
  assert.equal(steps2, 6)
  assert.equal(stepCount, 8)
})

test('Reverse thrust accelerates vehicle backwards up to maxReverseSpeed', () => {
  let state = createInitialCarState()
  const reverseInputs: CarInputs = { throttle: 0, brake: 0, steer: 0, reverse: 1 }
  const dt = 1 / 120

  for (let i = 0; i < 300; i++) {
    state = stepCar(state, reverseInputs, MONZA_CONFIG, SURFACE_ASPHALT, dt)
  }

  // Should have backwards velocity (+Z in world)
  assert.ok(state.velocity.z > 0, `Velocity Z should be positive (backward), got ${state.velocity.z}`)
  assert.ok(
    state.speed <= MONZA_CONFIG.maxReverseSpeed + 0.5,
    `Speed should not exceed maxReverseSpeed (${MONZA_CONFIG.maxReverseSpeed}), got ${state.speed}`,
  )
})

test('Steering yaw authority blends to zero at standstill', () => {
  const state0 = createInitialCarState()
  const steerInput: CarInputs = { throttle: 0, brake: 0, steer: 1 }
  const dt = 1 / 120

  const state1 = stepCar(state0, steerInput, MONZA_CONFIG, SURFACE_ASPHALT, dt)
  // At 0 speed, yaw rate should be 0 so car doesn't spin in place without moving
  assert.equal(state1.yawRate, 0)
  assert.equal(state1.heading, 0)
})

test('High-stress 50,000-step simulation runs stably without NaNs or divergence', () => {
  let state = createInitialCarState()
  const dt = 1 / 120

  for (let i = 0; i < 50000; i++) {
    const inputs: CarInputs = {
      throttle: i % 240 < 180 ? 1 : 0,
      brake: i % 240 >= 180 ? 0.8 : 0,
      steer: Math.sin(i * 0.05),
    }
    state = stepCar(state, inputs, MONZA_CONFIG, SURFACE_ASPHALT, dt)
  }

  assert.ok(!Number.isNaN(state.position.x))
  assert.ok(!Number.isNaN(state.position.z))
  assert.ok(!Number.isNaN(state.velocity.x))
  assert.ok(!Number.isNaN(state.velocity.z))
  assert.ok(!Number.isNaN(state.heading))
  assert.ok(!Number.isNaN(state.speed))
  assert.ok(state.speed >= 0 && state.speed < 120)
})
