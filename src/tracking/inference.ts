import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

const WASM_PATH = '/mediapipe/wasm'
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const HAND_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export type Delegate = 'GPU' | 'CPU'

/**
 * Plain-data result of one inference pass. Only landmarks cross the
 * thread boundary; the MediaPipe result objects stay where they ran.
 */
export type Detection = {
  timestamp: number
  /** The single tracked face (478 points), or null when none. */
  face: NormalizedLandmark[] | null
  /** One 21-point array per detected hand. */
  hands: NormalizedLandmark[][]
  /** 'Left' / 'Right' per hand, parallel to `hands`. */
  handedness: string[]
}

export type WorkerRequest =
  | { type: 'init' }
  | { type: 'frame'; frame: VideoFrame; timestamp: number }

export type WorkerResponse =
  | { type: 'ready'; delegate: Delegate }
  | { type: 'result'; detection: Detection }
  | { type: 'error'; message: string }

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Camera failed'
}

type LandmarkerOptions = {
  delegate: Delegate
  /**
   * Use the ES-module WASM glue (see `resolveFileset`). Required inside a
   * module worker; must stay false on the main thread, where MediaPipe
   * injects the classic glue as a script tag.
   */
  useModule: boolean
}

type WasmFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>

type FactoryScope = { ModuleFactory?: unknown }

type Fileset = {
  vision: WasmFileset
  /** Publish the WASM module factory where MediaPipe's loader looks for it. */
  exposeFactory: () => void
}

/**
 * MediaPipe's loader pulls its WASM glue in with `importScripts`, or with
 * `import()` inside module workers. Neither works here: `importScripts`
 * is unavailable in a module worker, and the `import()` path re-imports a
 * module that only evaluates once (so the second task finds no factory)
 * and is rewritten by Vite's dev server. So in the worker we import the
 * ES-module glue ourselves, keep its factory, and hand MediaPipe a fileset
 * with no loader path so it only reads the global we publish.
 */
async function resolveFileset(useModule: boolean): Promise<Fileset> {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH, useModule)
  if (!useModule) {
    return { vision, exposeFactory: () => {} }
  }

  // Absolute URL: Vite's dev server rewrites root-relative dynamic imports
  // into `?import` module requests, which it refuses for files in public/.
  const loaderUrl = new URL(vision.wasmLoaderPath, self.location.href).href
  const glue = (await import(/* @vite-ignore */ loaderUrl)) as {
    default?: unknown
  }
  const factory = glue.default
  if (typeof factory !== 'function') {
    throw new Error('MediaPipe module glue did not export ModuleFactory')
  }
  return {
    vision: { ...vision, wasmLoaderPath: '' },
    exposeFactory: () => {
      ;(globalThis as FactoryScope).ModuleFactory = factory
    },
  }
}

async function createLandmarkers({ delegate, useModule }: LandmarkerOptions) {
  const { vision, exposeFactory } = await resolveFileset(useModule)

  exposeFactory()
  const face = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: FACE_MODEL, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.6,
    minFacePresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  })

  let hands: HandLandmarker
  try {
    exposeFactory()
    hands = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
    })
  } catch (error) {
    face.close()
    throw error
  }

  return { face, hands }
}

/**
 * Face + hand landmarkers behind one synchronous `detect`. Runs wherever
 * it is constructed — inside the tracking worker normally, or on the main
 * thread as a fallback.
 */
export class Landmarkers {
  readonly delegate: Delegate
  private readonly face: FaceLandmarker
  private readonly hands: HandLandmarker

  private constructor(
    delegate: Delegate,
    face: FaceLandmarker,
    hands: HandLandmarker,
  ) {
    this.delegate = delegate
    this.face = face
    this.hands = hands
  }

  static async create(useModule = false): Promise<Landmarkers> {
    try {
      const { face, hands } = await createLandmarkers({
        delegate: 'GPU',
        useModule,
      })
      return new Landmarkers('GPU', face, hands)
    } catch {
      const { face, hands } = await createLandmarkers({
        delegate: 'CPU',
        useModule,
      })
      return new Landmarkers('CPU', face, hands)
    }
  }

  detect(source: TexImageSource, timestamp: number): Detection {
    const face = this.face.detectForVideo(source, timestamp)
    const hands = this.hands.detectForVideo(source, timestamp)
    return {
      timestamp,
      face: face.faceLandmarks[0] ?? null,
      hands: hands.landmarks,
      handedness: hands.handedness.map(
        (categories) => categories[0]?.categoryName ?? '',
      ),
    }
  }

  close() {
    this.face.close()
    this.hands.close()
  }
}
