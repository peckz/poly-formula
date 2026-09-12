import { observer } from 'mobx-react-lite'
import { raceStore } from '../game/store'
import { trackingStore } from '../tracking/store'

/** Full-screen prompt while the race is waiting to start or paused. */
export const GameOverlay = observer(function GameOverlay() {
  const { phase } = raceStore
  if (phase === 'running') {
    return null
  }

  const wheel = trackingStore.wheel
  const title = phase === 'paused' ? 'PAUSED' : 'READY'
  const line = wheel.grabbing
    ? 'hold the wheel steady…'
    : phase === 'paused'
      ? 'show both hands to resume'
      : 'show both hands and grip an imaginary wheel'

  return (
    <div className="game-overlay">
      <div className="game-overlay-card">
        <p className="game-overlay-title">{title}</p>
        <p className="game-overlay-line">{line}</p>
        <p className="game-overlay-hint">
          just steer · gas and brake are automatic · ride the green line for
          boost
        </p>
      </div>
    </div>
  )
})
