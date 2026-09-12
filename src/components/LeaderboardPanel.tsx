import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { entryStore } from '../entry/store'
import {
  DEFAULT_TRACK_ID,
  formatLapTime,
  sameNickname,
} from '../leaderboard/format'
import { leaderboardStore } from '../leaderboard/store'

function sourceLine(): string {
  const { configured, source, status, lastError } = leaderboardStore
  if (lastError) {
    return lastError
  }
  if (!configured) {
    return 'Local only — set VITE_CONVEX_URL to sync.'
  }
  if (status === 'loading') {
    return 'Loading leaderboard…'
  }
  if (source === 'convex') {
    return `Synced · ${DEFAULT_TRACK_ID}`
  }
  return 'Convex unreachable. Showing this device.'
}

function statusClass(): string {
  const { configured, status, lastError } = leaderboardStore
  if (lastError || status === 'error' || !configured) {
    return 'entry-status is-warn'
  }
  if (status === 'ready' && configured) {
    return 'entry-status is-ok'
  }
  return 'entry-status'
}

export const LeaderboardPanel = observer(function LeaderboardPanel() {
  const { open, rows } = leaderboardStore

  useEffect(() => {
    if (!open) {
      return
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        leaderboardStore.close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!open) {
    return null
  }

  const you = entryStore.trimmedNickname

  return (
    <div className="lb-screen" role="dialog" aria-labelledby="lb-title">
      <div className="lb-panel">
        <div className="lb-stripe" aria-hidden="true">
          <span className="entry-brick entry-brick-red" />
          <span className="entry-brick entry-brick-white" />
          <span className="entry-brick entry-brick-mint" />
        </div>

        <header className="lb-head">
          <div className="lb-head-copy">
            <h2 id="lb-title" className="lb-title">
              Leaderboard
            </h2>
            <p className="lb-track">{DEFAULT_TRACK_ID}</p>
          </div>
          <button
            type="button"
            className="entry-btn entry-btn-ghost lb-close"
            onClick={() => {
              leaderboardStore.close()
            }}
          >
            Close
          </button>
        </header>

        <div className="lb-cols" aria-hidden="true">
          <span>Pos</span>
          <span>Driver</span>
          <span>Best</span>
        </div>

        {rows.length === 0 ? (
          <p className="lb-empty">No laps yet. Finish a flying lap.</p>
        ) : (
          <ol className="lb-list">
            {rows.map((row, index) => {
              const mine = you.length > 0 && sameNickname(row.nickname, you)
              return (
                <li
                  key={row.id}
                  className={mine ? 'lb-row is-you' : 'lb-row'}
                >
                  <span className="lb-rank">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {row.avatarUrl ? (
                    <img className="lb-face" src={row.avatarUrl} alt="" />
                  ) : (
                    <span className="lb-face lb-face-empty" aria-hidden="true" />
                  )}
                  <span className="lb-name">{row.nickname}</span>
                  <span className="lb-time">{formatLapTime(row.lapMs)}</span>
                </li>
              )
            })}
          </ol>
        )}

        <footer className="lb-foot">
          <p className={statusClass()} role="status">
            {sourceLine()}
          </p>
          <p className="lb-count">
            {rows.length === 0
              ? 'Empty board'
              : `${rows.length} driver${rows.length === 1 ? '' : 's'}`}
          </p>
        </footer>
      </div>
    </div>
  )
})
