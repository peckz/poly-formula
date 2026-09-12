import { observer } from 'mobx-react-lite'
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
    return 'Loading times…'
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
  if (!open) {
    return null
  }

  const you = entryStore.trimmedNickname

  return (
    <div
      className="lb-overlay"
      onClick={() => {
        leaderboardStore.close()
      }}
    >
      <div
        className="lb-card"
        role="dialog"
        aria-labelledby="lb-title"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <div className="lb-stripe" aria-hidden="true">
          <span className="entry-brick entry-brick-red" />
          <span className="entry-brick entry-brick-white" />
          <span className="entry-brick entry-brick-mint" />
        </div>
        <header className="lb-head">
          <h2 id="lb-title" className="lb-title">
            Times
          </h2>
          <p className="lb-track">{DEFAULT_TRACK_ID}</p>
        </header>
        {rows.length === 0 ? (
          <p className="lb-empty">No times yet. Finish a lap.</p>
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
                    <img
                      className="lb-face"
                      src={row.avatarUrl}
                      alt=""
                    />
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
        <p className={statusClass()} role="status">
          {sourceLine()}
        </p>
        <button
          type="button"
          className="entry-btn entry-btn-ghost"
          onClick={() => {
            leaderboardStore.close()
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
})
