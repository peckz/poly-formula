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
    ? 'Hold the wheel steady…'
    : phase === 'paused'
      ? 'Show both hands to resume. Gas and brake stay automatic.'
      : 'Grip an imaginary wheel — gas and brake are automatic.'

  return (
    <div className="game-overlay">
      <div className="game-overlay-card">
        <div className="game-overlay-stripe" aria-hidden="true">
          <span className="entry-brick entry-brick-red" />
          <span className="entry-brick entry-brick-white" />
          <span className="entry-brick entry-brick-mint" />
        </div>
        <div className="game-overlay-banner">
          <p className="game-overlay-title">{title}</p>
          <div className="game-overlay-copy">
            <p className="game-overlay-line">{line}</p>
            <p className="game-overlay-keys">WASD also drives.</p>
            {phase === 'waiting' && !wheel.grabbing ? (
              <p className="game-overlay-hint">Ride the green line for boost.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
})
