import { observer } from 'mobx-react-lite'
import { raceStore } from '../game/store'

export const RaceHud = observer(function RaceHud() {
  const { speedKmh, gear, lap, steerSource, offTrack } = raceStore

  return (
    <aside className="race-hud">
      <p className="race-hud-speed">
        {speedKmh}
        <span> km/h</span>
      </p>
      <p className="race-hud-row">
        <span>gear {gear}</span>
        <span>lap {lap}</span>
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
