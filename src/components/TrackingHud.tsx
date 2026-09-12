import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import type { Point3 } from '../tracking/store'
import { trackingStore } from '../tracking/store'

function fmt(value: number) {
  return value.toFixed(2)
}

const PointBlock = observer(function PointBlock({
  label,
  point,
}: {
  label: string
  point: Point3
}) {
  return (
    <section>
      <h2>
        {label}{' '}
        <span className={point.detected ? 'ok' : 'off'}>
          {point.detected ? 'on' : 'off'}
        </span>
      </h2>
      <p>x {fmt(point.x)}</p>
      <p>y {fmt(point.y)}</p>
      <p>z {fmt(point.z)}</p>
    </section>
  )
})

export const TrackingHud = observer(function TrackingHud() {
  const { fps, head, leftHand, rightHand, wheel } = trackingStore
  const [falStatus, setFalStatus] = useState<'loading' | 'ready' | 'missing'>(
    'loading',
  )

  useEffect(() => {
    let cancelled = false

    void fetch('/api/fal/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error('health failed')
        }
        return response.json() as Promise<{ configured?: boolean }>
      })
      .then((data) => {
        if (cancelled) {
          return
        }
        setFalStatus(data.configured ? 'ready' : 'missing')
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setFalStatus('missing')
      })

    return () => {
      cancelled = true
    }
  }, [])

  let falLabel = 'fal …'
  if (falStatus === 'ready') {
    falLabel = 'fal ready'
  } else if (falStatus === 'missing') {
    falLabel = 'fal missing key'
  }

  return (
    <aside className="tracking-hud">
      <p className="fps">{fps} fps</p>
      <p className={falStatus === 'ready' ? 'ok' : 'off'}>{falLabel}</p>
      <section>
        <h2>
          Head{' '}
          <span className={head.detected ? 'ok' : 'off'}>
            {head.calibrating ? 'cal' : head.detected ? 'on' : 'off'}
          </span>
        </h2>
        <p>yaw {fmt(head.yaw)}</p>
        <p>pitch {fmt(head.pitch)}</p>
        <p>
          cell {head.col},{head.row}
        </p>
        <p>fwd {fmt(head.forward)}</p>
        <p>side {fmt(head.sideways)}</p>
      </section>
      <PointBlock label="Left hand" point={leftHand} />
      <PointBlock label="Right hand" point={rightHand} />
      <section>
        <h2>
          Wheel{' '}
          <span className={wheel.held ? 'ok' : 'off'}>
            {wheel.grabbing ? 'grip' : wheel.held ? 'on' : 'off'}
          </span>
        </h2>
        <p>{fmt(wheel.steering)}</p>
      </section>
    </aside>
  )
})
