import type { WheelFrame } from './wheel'

const GRIP_SPAN = 0.78

const sprite = new Image()
sprite.src = '/sprites/wheel.png'

export function drawDriverWheel(ctx: CanvasRenderingContext2D, wheel: WheelFrame) {
  if (!wheel.held || !sprite.complete || sprite.naturalWidth === 0) {
    return false
  }

  const drawW = wheel.span / GRIP_SPAN
  const drawH = drawW * (sprite.naturalHeight / sprite.naturalWidth)

  ctx.save()
  ctx.translate(wheel.x, wheel.y)
  ctx.rotate(wheel.angle)
  ctx.scale(-1, 1)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()
  return true
}
