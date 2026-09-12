import {
  Landmarkers,
  errorMessage,
  type WorkerRequest,
  type WorkerResponse,
} from './inference'

// Minimal view of the dedicated-worker scope; the app compiles against
// the DOM lib, so `self` is typed as a Window here.
type WorkerScope = {
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
}

const scope = self as unknown as WorkerScope

let landmarkers: Landmarkers | null = null

/**
 * Runs MediaPipe face + hand inference off the main thread. Each pass ends
 * in a synchronous GPU readback; here that stall only blocks this worker,
 * never the game loop.
 */
scope.onmessage = async (event) => {
  const message = event.data

  if (message.type === 'init') {
    try {
      landmarkers = await Landmarkers.create(true)
      scope.postMessage({ type: 'ready', delegate: landmarkers.delegate })
    } catch (error) {
      scope.postMessage({ type: 'error', message: errorMessage(error) })
    }
    return
  }

  if (message.type === 'frame') {
    const { frame, timestamp } = message
    try {
      if (!landmarkers) {
        throw new Error('Tracking worker not initialised')
      }
      const detection = landmarkers.detect(frame, timestamp)
      scope.postMessage({ type: 'result', detection })
    } catch (error) {
      scope.postMessage({ type: 'error', message: errorMessage(error) })
    } finally {
      frame.close()
    }
  }
}
