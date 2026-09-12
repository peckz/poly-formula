import type { CarInputs } from '../physics/types.ts'

export interface InputController {
  getInputs: (longitudinalSpeed: number) => CarInputs
  isResetRequested: () => boolean
  consumeReset: () => boolean
  dispose: () => void
}

/**
 * Keyboard input manager supporting WASD, Arrow keys, Space, and Reset.
 */
export function createInputController(targetElement: HTMLElement | Window = window): InputController {
  const keysDown = new Set<string>()
  let resetRequested = false

  // Filter keys so we don't accidentally intercept browser shortcuts unnecessarily
  const onKeyDown = (e: KeyboardEvent) => {
    // Ignore when user is typing in an input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    const key = e.code
    keysDown.add(key)

    if (key === 'KeyR') {
      resetRequested = true
    }

    // Prevent default scrolling for arrows and space
    if (
      key === 'ArrowUp' ||
      key === 'ArrowDown' ||
      key === 'ArrowLeft' ||
      key === 'ArrowRight' ||
      key === 'Space'
    ) {
      e.preventDefault()
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    keysDown.delete(e.code)
  }

  const onBlur = () => {
    keysDown.clear()
  }

  targetElement.addEventListener('keydown', onKeyDown as EventListener)
  targetElement.addEventListener('keyup', onKeyUp as EventListener)
  window.addEventListener('blur', onBlur)

  let smoothedSteer = 0

  return {
    getInputs(longitudinalSpeed: number): CarInputs {
      const up = keysDown.has('KeyW') || keysDown.has('ArrowUp')
      const down = keysDown.has('KeyS') || keysDown.has('ArrowDown')
      const left = keysDown.has('KeyA') || keysDown.has('ArrowLeft')
      const right = keysDown.has('KeyD') || keysDown.has('ArrowRight')
      const space = keysDown.has('Space')

      let throttle = 0
      let brake = 0
      let reverse = 0

      if (up) {
        throttle = 1
      }

      if (down) {
        if (longitudinalSpeed > 0.5) {
          // Forward motion: S key acts as brake
          brake = 1
        } else {
          // Stopped / low speed / reversing: S key reverses
          reverse = 1
        }
      }

      if (space) {
        brake = 1
      }

      // Smooth keyboard steering response
      let targetSteer = 0
      if (left && !right) {
        targetSteer = -1
      } else if (right && !left) {
        targetSteer = 1
      }

      // Fast snap-to-target interpolation
      smoothedSteer += (targetSteer - smoothedSteer) * 0.25

      return {
        throttle,
        brake,
        steer: smoothedSteer,
        reverse,
      }
    },

    isResetRequested() {
      return resetRequested
    },

    consumeReset() {
      const val = resetRequested
      resetRequested = false
      return val
    },

    dispose() {
      targetElement.removeEventListener('keydown', onKeyDown as EventListener)
      targetElement.removeEventListener('keyup', onKeyUp as EventListener)
      window.removeEventListener('blur', onBlur)
    },
  }
}
