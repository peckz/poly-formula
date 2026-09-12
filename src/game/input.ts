const THROTTLE_KEYS = ['KeyW', 'ArrowUp']
const BRAKE_KEYS = ['KeyS', 'ArrowDown']
const LEFT_KEYS = ['KeyA', 'ArrowLeft']
const RIGHT_KEYS = ['KeyD', 'ArrowRight']

export class Keyboard {
  private pressed = new Set<string>()

  private onKeyDown = (event: KeyboardEvent) => {
    this.pressed.add(event.code)
  }

  private onKeyUp = (event: KeyboardEvent) => {
    this.pressed.delete(event.code)
  }

  attach() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.pressed.clear()
  }

  private any(codes: string[]) {
    return codes.some((code) => this.pressed.has(code))
  }

  get throttle(): number {
    return this.any(THROTTLE_KEYS) ? 1 : 0
  }

  get brake(): number {
    return this.any(BRAKE_KEYS) ? 1 : 0
  }

  /** Positive = left, matching the sim's heading convention. */
  get steer(): number {
    return (this.any(LEFT_KEYS) ? 1 : 0) - (this.any(RIGHT_KEYS) ? 1 : 0)
  }
}
