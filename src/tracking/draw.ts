import {
  FaceLandmarker,
  HandLandmarker,
  type FaceLandmarkerResult,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

function drawConnections(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  connections: ReadonlyArray<{ start: number; end: number }>,
  color: string,
) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()

  for (const { start, end } of connections) {
    const a = landmarks[start]
    const b = landmarks[end]
    if (!a || !b) {
      continue
    }
    ctx.moveTo(a.x * ctx.canvas.width, a.y * ctx.canvas.height)
    ctx.lineTo(b.x * ctx.canvas.width, b.y * ctx.canvas.height)
  }

  ctx.stroke()
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  color: string,
  radius: number,
) {
  ctx.fillStyle = color
  for (const landmark of landmarks) {
    ctx.beginPath()
    ctx.arc(
      landmark.x * ctx.canvas.width,
      landmark.y * ctx.canvas.height,
      radius,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
}

export function drawTracking(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  face: FaceLandmarkerResult,
  hands: HandLandmarkerResult,
) {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) {
    return
  }

  if (canvas.width !== width) {
    canvas.width = width
  }
  if (canvas.height !== height) {
    canvas.height = height
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.clearRect(0, 0, width, height)

  const faceLandmarks = face.faceLandmarks[0]
  if (faceLandmarks) {
    drawConnections(ctx, faceLandmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, '#7dff9a')
    drawDots(ctx, [faceLandmarks[4]], '#7dff9a', 4)
  }

  for (const landmarks of hands.landmarks) {
    drawConnections(ctx, landmarks, HandLandmarker.HAND_CONNECTIONS, '#7ec8ff')
    drawDots(ctx, landmarks, '#7ec8ff', 3)
  }
}
