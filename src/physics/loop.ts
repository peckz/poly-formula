/**
 * Configuration options for the fixed-timestep physics accumulator.
 */
export interface PhysicsAccumulatorOptions {
  /** Fixed timestep per simulation step in seconds. Default: 1/120 (~8.33ms) */
  fixedDt?: number
  /** Maximum number of simulation catch-up steps allowed per frame. Default: 6 */
  maxSubSteps?: number
}

/**
 * High-precision fixed-timestep accumulator for requestAnimationFrame loops.
 * Protects against spiral-of-death when frames drop or tab loses focus.
 */
export class PhysicsAccumulator {
  public readonly fixedDt: number
  public readonly maxSubSteps: number
  private accumulator = 0

  constructor(options: PhysicsAccumulatorOptions = {}) {
    this.fixedDt = options.fixedDt ?? 1 / 120
    this.maxSubSteps = options.maxSubSteps ?? 6
  }

  /**
   * Advances the accumulator with the elapsed frame time and invokes `stepFn`
   * once per fixedDt sub-step.
   *
   * @param deltaSeconds Raw delta time between render frames in seconds.
   * @param stepFn Callback executed for every fixed physics tick.
   * @returns Number of fixed physics ticks executed in this frame.
   */
  public advance(deltaSeconds: number, stepFn: (dt: number) => void): number {
    // Clamp huge frame deltas (e.g. background tab or debugger pause)
    const maxFrameDelta = this.fixedDt * this.maxSubSteps
    const clampedDelta = Math.min(Math.max(deltaSeconds, 0), maxFrameDelta)
    this.accumulator += clampedDelta

    let stepsExecuted = 0
    while (this.accumulator >= this.fixedDt && stepsExecuted < this.maxSubSteps) {
      stepFn(this.fixedDt)
      this.accumulator -= this.fixedDt
      stepsExecuted++
    }

    // Discard excess backlog if tab was stalled to avoid catching up indefinitely
    if (this.accumulator > this.fixedDt * 2) {
      this.accumulator = 0
    }

    return stepsExecuted
  }

  /**
   * Interpolation factor alpha in [0, 1) for blending render poses between physics ticks.
   */
  public get alpha(): number {
    return this.accumulator / this.fixedDt
  }

  /**
   * Clears any accumulated time.
   */
  public reset(): void {
    this.accumulator = 0
  }
}
