import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { HeadState } from './face'

const COLS = 5
const ROWS = 5
const SAMPLE_W = 96
const SAMPLE_H = 112
const FOREHEAD = 10
const CHIN = 152
const LEFT_EYE = 33
const RIGHT_EYE = 263
const LEFT_CHEEK = 234
const RIGHT_CHEEK = 454
const SCALE = 1.25

const DEFAULT_ATLAS = '/sprites/leclerc-atlas.png'

const sprite = new Image()
sprite.crossOrigin = 'anonymous'
sprite.src = DEFAULT_ATLAS

const buffer = document.createElement('canvas')
buffer.width = SAMPLE_W
buffer.height = SAMPLE_H
const pixels = buffer.getContext('2d')

/**
 * Point head tracking at a generated 5×5 atlas URL, or pass null to
 * fall back to the baked Leclerc sheet.
 */
export function setDriverAtlasUrl(url: string | null) {
  sprite.src = url && url.length > 0 ? url : DEFAULT_ATLAS
}

function distance(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  width: number,
  height: number,
) {
  return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height)
}

export function drawDriverHead(
  ctx: CanvasRenderingContext2D,
  points: NormalizedLandmark[],
  head: HeadState,
) {
  if (!sprite.complete || sprite.naturalWidth === 0 || !pixels) {
    return false
  }

  const leftEye = points[LEFT_EYE]
  const rightEye = points[RIGHT_EYE]
  const forehead = points[FOREHEAD]
  const chin = points[CHIN]
  const leftCheek = points[LEFT_CHEEK]
  const rightCheek = points[RIGHT_CHEEK]
  if (!leftEye || !rightEye || !forehead || !chin || !leftCheek || !rightCheek) {
    return false
  }

  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const eyes = [leftEye, rightEye].sort((a, b) => a.x - b.x)
  const x = ((eyes[0].x + eyes[1].x) / 2) * width
  const y = ((eyes[0].y + eyes[1].y) / 2) * height
  const roll = Math.atan2(
    (eyes[1].y - eyes[0].y) * height,
    (eyes[1].x - eyes[0].x) * width,
  )

  const baseHeight = distance(forehead, chin, width, height) * 1.6
  const drawH = baseHeight * SCALE
  const drawW =
    Math.max(distance(leftCheek, rightCheek, width, height) * 1.55, baseHeight * 0.8) *
    SCALE

  const cellW = sprite.naturalWidth / COLS
  const cellH = sprite.naturalHeight / ROWS

  pixels.imageSmoothingEnabled = false
  pixels.clearRect(0, 0, SAMPLE_W, SAMPLE_H)
  pixels.drawImage(
    sprite,
    (head.col + 0.08) * cellW,
    (head.row + 0.01) * cellH,
    cellW * 0.84,
    cellH * 0.84,
    0,
    0,
    SAMPLE_W,
    SAMPLE_H,
  )

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(roll)
  ctx.scale(-1, 1)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(buffer, -drawW / 2, -drawH * 0.48, drawW, drawH)
  ctx.restore()
  return true
}
