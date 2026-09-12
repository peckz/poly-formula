import { observer } from 'mobx-react-lite'
import { raceStore } from '../game/store'
import { monzaPath } from '../game/trackPath'
import { formatLapTime } from '../leaderboard/format'
import { leaderboardStore } from '../leaderboard/store'

const MAP_PAD = 60
const CAR_PIP = 56

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
    lapMs,
    lastLapMs,
    steerSource,
    offTrack,
    cornerName,
    cornerDistM,
    slowing,
    attacking,
    boost,
    carX,
    carZ,
  } = raceStore

  return (
    <>
      <button
        type="button"
        className="race-times-btn"
        onClick={() => {
          leaderboardStore.toggle()
        }}
      >
        Times
      </button>
      <aside className="race-pace">
        {attacking ? (
          <p className="race-hud-attack">Boost</p>
        ) : slowing ? (
          <p className="race-hud-slowing">Slowing</p>
        ) : null}
        <p className="race-hud-speed">
          {speedKmh}
          <span> km/h</span>
        </p>
        <p className="race-hud-row">
          <span>gear {gear}</span>
          <span>lap {lap}</span>
        </p>
        <p className="race-hud-row">
          <span>{formatLapTime(lapMs)}</span>
          <span>{lastLapMs !== null ? `last ${formatLapTime(lastLapMs)}` : 'last —'}</span>
        </p>
        <p className="race-hud-corner">
          {cornerName} <span>{cornerDistM}m</span>
        </p>
        {steerSource === 'wheel' ? (
          <div className="race-hud-boost" aria-label="boost">
            <div
              className="race-hud-boost-fill"
              style={{ width: `${Math.round(boost * 100)}%` }}
            />
          </div>
        ) : null}
        <p className="race-hud-row">
          <span className={steerSource === 'wheel' ? 'ok' : 'off'}>
            {steerSource === 'wheel' ? 'hands on wheel' : 'keyboard'}
          </span>
          {offTrack ? <span className="warn">off track</span> : null}
        </p>
      </aside>
      <aside className="race-map" aria-label="track map">
        <svg
          className="race-hud-map"
          viewBox={`${mapBounds.x} ${mapBounds.z} ${mapBounds.w} ${mapBounds.h}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <polygon
            points={mapOutline}
            fill="none"
            stroke="#9aa3ad"
            strokeWidth="16"
            strokeLinejoin="miter"
          />
          <rect
            x={carX - CAR_PIP / 2}
            y={carZ - CAR_PIP / 2}
            width={CAR_PIP}
            height={CAR_PIP}
            fill="#d0181c"
          />
        </svg>
      </aside>
    </>
  )
})
