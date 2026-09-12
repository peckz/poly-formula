import { observer } from 'mobx-react-lite'
import { useEffect, useRef } from 'react'
import { CameraPipeline } from '../tracking/pipeline'
import { trackingStore } from '../tracking/store'

const CameraStatus = observer(function CameraStatus() {
  const { status, error } = trackingStore

  if (status === 'running') {
    return null
  }

  return (
    <div className="camera-status">
      {status === 'loading' && <span>Loading camera…</span>}
      {status === 'idle' && <span>Camera idle</span>}
      {status === 'error' && <span>{error ?? 'Camera error'}</span>}
    </div>
  )
})

export function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const overlay = overlayRef.current
    if (!video || !overlay) {
      return
    }

    const pipeline = new CameraPipeline()
    void pipeline.start(video, overlay)

    return () => pipeline.stop()
  }, [])

  return (
    <div className="camera-feed">
      <video ref={videoRef} playsInline muted />
      <canvas ref={overlayRef} />
      <CameraStatus />
    </div>
  )
}
