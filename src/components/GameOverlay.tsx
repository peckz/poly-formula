import { observer } from 'mobx-react-lite'
import { raceStore } from '../game/store'
import { trackingStore } from '../tracking/store'

type OverlayPhase = 'waiting' | 'paused'

type TutorialStep = {
  id: 'camera' | 'grip' | 'keys'
  num: string
  label: string
  body: string
  tone: 'primary' | 'grip' | 'keys'
  active: boolean
}

function tutorialKicker(phase: OverlayPhase): string {
  return phase === 'paused' ? 'Tutorial · How to resume' : 'Tutorial · How to drive'
}

function tutorialSteps(phase: OverlayPhase, grabbing: boolean): TutorialStep[] {
  const cameraBody =
    phase === 'paused'
      ? 'Show both hands in the camera view to resume. The camera is required for the intended control scheme.'
      : 'Put both hands into the camera view. The camera is required — this is how you drive.'

  const gripBody = grabbing
    ? 'Hold the wheel steady…'
    : 'Grip an imaginary wheel. Gas and brake stay automatic.'

  const keysBody =
    phase === 'paused'
      ? 'WASD still works as the keyboard fallback if you skip the camera.'
      : 'You can also use WASD. Keyboard is the fallback if you skip the camera.'

  return [
    {
      id: 'camera',
      num: '1',
      label: 'Camera',
      body: cameraBody,
      tone: 'primary',
      active: !grabbing,
    },
    {
      id: 'grip',
      num: '2',
      label: 'Grip',
      body: gripBody,
      tone: 'grip',
      active: grabbing,
    },
    {
      id: 'keys',
      num: '3',
      label: 'Keyboard',
      body: keysBody,
      tone: 'keys',
      active: false,
    },
  ]
}

/** Full-screen tutorial while the race is waiting to start or paused. */
export const GameOverlay = observer(function GameOverlay() {
  const { phase } = raceStore
  if (phase === 'running') {
    return null
  }

  const overlayPhase: OverlayPhase = phase === 'paused' ? 'paused' : 'waiting'
  const grabbing = trackingStore.wheel.grabbing
  const title = overlayPhase === 'paused' ? 'PAUSED' : 'READY'
  const steps = tutorialSteps(overlayPhase, grabbing)
  const showBoost = overlayPhase === 'waiting'

  return (
    <div className="game-overlay">
      <div className="game-overlay-card" role="status" aria-live="polite">
        <div className="game-overlay-stripe" aria-hidden="true">
          <span className="entry-brick entry-brick-red" />
          <span className="entry-brick entry-brick-white" />
          <span className="entry-brick entry-brick-mint" />
        </div>

        <header className="game-overlay-head">
          <p className="game-overlay-kicker">{tutorialKicker(overlayPhase)}</p>
          <p className="game-overlay-title">{title}</p>
        </header>

        <ol className="game-overlay-steps">
          {steps.map((step) => {
            const className = `game-overlay-step is-${step.tone}${step.active ? ' is-active' : ''}`
            return (
              <li key={step.id} className={className}>
                <span className="game-overlay-step-num" aria-hidden="true">
                  {step.num}
                </span>
                <div className="game-overlay-step-copy">
                  <p className="game-overlay-step-label">
                    {step.label}
                    {step.id === 'camera' ? (
                      <span className="game-overlay-step-badge">Required</span>
                    ) : null}
                    {step.id === 'keys' ? (
                      <span className="game-overlay-step-badge is-backup">Backup</span>
                    ) : null}
                  </p>
                  <p className="game-overlay-step-body">{step.body}</p>
                  {step.id === 'keys' ? (
                    <div className="game-overlay-keycaps" aria-hidden="true">
                      <span>W</span>
                      <span>A</span>
                      <span>S</span>
                      <span>D</span>
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>

        {showBoost ? (
          <p className="game-overlay-hint">Ride the green line for boost.</p>
        ) : null}
      </div>
    </div>
  )
})
