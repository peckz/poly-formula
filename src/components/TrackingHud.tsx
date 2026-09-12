import { observer } from 'mobx-react-lite'
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
  const { fps, head, leftHand, rightHand, wheelAngle } = trackingStore

  return (
    <aside className="tracking-hud">
      <p className="fps">{fps} fps</p>
      <section>
        <h2>
          Head{' '}
          <span className={head.detected ? 'ok' : 'off'}>
            {head.detected ? 'on' : 'off'}
          </span>
        </h2>
        <p>x {fmt(head.x)}</p>
        <p>y {fmt(head.y)}</p>
        <p>z {fmt(head.z)}</p>
        <p>yaw {fmt(head.yaw)}</p>
        <p>pitch {fmt(head.pitch)}</p>
        <p>roll {fmt(head.roll)}</p>
      </section>
      <PointBlock label="Left hand" point={leftHand} />
      <PointBlock label="Right hand" point={rightHand} />
      <section>
        <h2>
          Wheel{' '}
          <span className={wheelAngle === null ? 'off' : 'ok'}>
            {wheelAngle === null ? 'off' : 'on'}
          </span>
        </h2>
        <p>{wheelAngle === null ? '—' : `${fmt(wheelAngle)}°`}</p>
      </section>
    </aside>
  )
})
