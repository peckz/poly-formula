/**
 * Vector in the 2D ground plane (X-Z in Three.js world coordinates).
 * Units: metres.
 */
export interface Vec2 {
  x: number;
  z: number;
}

/**
 * Aerodynamic, powertrain, and chassis configuration for the vehicle.
 * All units are standard SI (m, kg, s, N, W, rad).
 */
export interface CarConfig {
  /** Total vehicle mass including driver (kg). Default: 780 */
  mass: number;
  /** Maximum powertrain wheel power (Watts). Default: 700_000 (700 kW ~ 940 hp) */
  powerMax: number;
  /** Stall/virtual minimum speed for thrust calculation (m/s). Default: 10 */
  vStall: number;
  /** Drag area: drag coefficient * frontal reference area (m²). Default: 1.10 */
  cdA: number;
  /** Downforce area: lift coefficient * reference area (m²). Default: 3.0 */
  clA: number;
  /** Rolling resistance coefficient (dimensionless). Default: 0.015 */
  crr: number;
  /** Peak asphalt tire friction coefficient (dimensionless). Default: 1.7 */
  muAsphalt: number;
  /** Peak braking deceleration capability (m/s²). Default: 50 */
  brakeAccel: number;
  /** Air density (kg/m³). Default: 1.225 (ISA sea level) */
  airDensity: number;
  /** Gravitational acceleration (m/s²). Default: 9.81 */
  gravity: number;
  /** Base maximum yaw rate at low/medium speed (rad/s). Default: 1.6 */
  maxSteerRate: number;
  /** Speed at which full steering authority blends in (m/s). Default: 2.0 */
  steerBlendSpeed: number;
  /** Reverse power ratio relative to powerMax. Default: 0.25 */
  reversePowerRatio: number;
  /** Max reverse speed (m/s). Default: 15 (54 km/h) */
  maxReverseSpeed: number;
}

/**
 * Surface friction and drag properties.
 */
export interface SurfaceConfig {
  /** Tire-road friction coefficient multiplier / value */
  mu: number;
  /** Rolling resistance coefficient */
  rollingResistanceCoeff: number;
  /** Extra linear drag resistance (N / (m/s)) for loose surfaces like gravel */
  linearDrag: number;
}

/**
 * Driver control inputs normalized to [0, 1] or [-1, 1].
 */
export interface CarInputs {
  /** Throttle pedal input [0, 1] */
  throttle: number;
  /** Brake pedal input [0, 1] */
  brake: number;
  /** Steering wheel input [-1, 1] (negative = left, positive = right) */
  steer: number;
  /** Handbrake input [0, 1] (optional) */
  handbrake?: number;
  /** Explicit reverse request [0, 1] (optional) */
  reverse?: number;
}

/**
 * Instantaneous telemetry for HUD and diagnostic inspection.
 */
export interface CarTelemetry {
  /** Forward speed in m/s (signed: positive = forward, negative = reverse) */
  longitudinalSpeed: number;
  /** Lateral slide speed in m/s */
  lateralSpeed: number;
  /** Scalar speed in km/h */
  speedKmH: number;
  /** Aerodynamic downforce (N) */
  downforceN: number;
  /** Aerodynamic drag force (N) */
  dragForceN: number;
  /** Maximum normal load Fn (N) */
  normalLoadN: number;
  /** Maximum tire friction capacity Fmax (N) */
  frictionLimitN: number;
  /** Longitudinal tire force applied (N) */
  fLongN: number;
  /** Lateral tire force applied (N) */
  fLatN: number;
  /** Friction ellipse utilization [0, 1] */
  gripUtilization: number;
  /** Yaw rate (rad/s) */
  yawRate: number;
  /** Forward acceleration (m/s²) */
  longitudinalAccel: number;
  /** Lateral acceleration (m/s²) */
  lateralAccel: number;
}

/**
 * Dynamic state of the car.
 */
export interface CarState {
  /** 2D position in world metres (x: east, z: south/forward) */
  position: Vec2;
  /** 2D velocity vector in world m/s */
  velocity: Vec2;
  /** Heading angle (yaw) in radians. 0 = -Z (north/forward in Three.js) */
  heading: number;
  /** Current yaw rate (rad/s) */
  yawRate: number;
  /** Scalar speed (m/s) */
  speed: number;
  /** Telemetry computed during the last physics step */
  telemetry: CarTelemetry;
}
