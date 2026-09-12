import { observer } from 'mobx-react-lite'
import { raceStore } from '../game/store'
import { monzaPath } from '../game/trackPath'

const MAP_PAD = 60

const mapBounds = (() => {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const point of monzaPath.points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minZ = Math.min(minZ, point.z)
    maxZ = Math.max(maxZ, point.z)
  }
  return {
    x: minX - MAP_PAD,
    z: minZ - MAP_PAD,
    w: maxX - minX + MAP_PAD * 2,
    h: maxZ - minZ + MAP_PAD * 2,
  }
})()

const mapOutline = monzaPath.points
  .filter((_, i) => i % 6 === 0)
  .map((point) => `${point.x.toFixed(0)},${point.z.toFixed(0)}`)
  .join(' ')

export const RaceHud = observer(function RaceHud() {
  const {
    speedKmh,
    gear,
    lap,
    steerSource,
    offTrack,
    cornerName,
    cornerDistM,
    carX,
    carZ,
  } = raceStore

  return (
    <aside className="race-hud">
      <svg
        className="race-hud-map"
        viewBox={`${mapBounds.x} ${mapBounds.z} ${mapBounds.w} ${mapBounds.h}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <polygon
          points={mapOutline}
          fill="none"
          stroke="#9a9a9a"
          strokeWidth="16"
          strokeLinejoin="round"
        />
        <circle cx={carX} cy={carZ} r="34" fill="#ff2a2a" />
      </svg>
      <p className="race-hud-speed">
        {speedKmh}
        <span> km/h</span>
      </p>
      <p className="race-hud-row">
        <span>gear {gear}</span>
        <span>lap {lap}</span>
      </p>
      <p className="race-hud-corner">
        {cornerName} <span>{cornerDistM}m</span>
      </p>
      <p className="race-hud-row">
        <span className={steerSource === 'wheel' ? 'ok' : 'off'}>
          {steerSource === 'wheel' ? 'hands on wheel' : 'keyboard'}
        </span>
        {offTrack ? <span className="warn">off track</span> : null}
      </p>
    </aside>
  )
})
