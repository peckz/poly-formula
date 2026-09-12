import { observer } from 'mobx-react-lite'
import type { FormEvent, KeyboardEvent } from 'react'
import { useEffect } from 'react'
import { entryStore, NICKNAME_LIMIT } from '../entry/store'

function falLine(): string {
  const { falStatus, avatarStatus, avatarError } = entryStore
  if (avatarStatus === 'generating') {
    return 'Generating avatar…'
  }
  if (avatarError) {
    return avatarError
  }
  if (falStatus === 'ready') {
    return 'fal.ai ready'
  }
  if (falStatus === 'missing') {
    return 'fal.ai key missing. Generate uses a placeholder.'
  }
  return 'Checking fal.ai…'
}

function statusClass(): string {
  const { falStatus, avatarStatus, avatarError } = entryStore
  if (avatarStatus === 'error' || avatarStatus === 'placeholder' || falStatus === 'missing') {
    return 'entry-status is-warn'
  }
  if (falStatus === 'ready' && !avatarError) {
    return 'entry-status is-ok'
  }
  return 'entry-status'
}

export const EntryScreen = observer(function EntryScreen() {
  const { nickname, avatarUrl, avatarStatus, canStart, generating } = entryStore

  useEffect(() => {
    void entryStore.checkFal()
  }, [])

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    entryStore.start()
  }

  function onNicknameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      entryStore.start()
    }
  }

  const avatarLabel =
    avatarStatus === 'ready'
      ? `Generated avatar for ${nickname || 'driver'}`
      : avatarStatus === 'placeholder' || avatarStatus === 'error'
        ? `Placeholder avatar for ${nickname || 'driver'}`
        : 'Avatar placeholder'

  return (
    <div className="entry-screen">
      <form className="entry-card" onSubmit={onSubmit}>
        <header className="entry-brand">
          <div className="entry-mark" aria-hidden="true">
            <span className="entry-brick entry-brick-red" />
            <span className="entry-brick entry-brick-white" />
            <span className="entry-brick entry-brick-mint" />
          </div>
          <h1 className="entry-title">
            Poly
            <br />
            Formula
          </h1>
          <p className="entry-sub">Monza · 5793 m</p>
        </header>

        <div
          className={`entry-avatar${generating ? ' is-generating' : ''}`}
          data-state={avatarStatus}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={avatarLabel} />
          ) : (
            <div className="entry-avatar-empty" aria-hidden="true">
              <span className="entry-brick entry-brick-red" />
              <span className="entry-brick entry-brick-white" />
              <span className="entry-brick entry-brick-mint" />
              <span className="entry-brick entry-brick-asphalt" />
            </div>
          )}
          {!avatarUrl ? <p className="entry-avatar-caption">No avatar</p> : null}
        </div>

        <label className="entry-field" htmlFor="entry-nickname">
          <span>Nickname</span>
          <input
            id="entry-nickname"
            name="nickname"
            type="text"
            autoComplete="nickname"
            autoFocus
            maxLength={NICKNAME_LIMIT}
            placeholder="Enter a name"
            value={nickname}
            disabled={generating}
            onChange={(event) => {
              entryStore.setNickname(event.target.value)
            }}
            onKeyDown={onNicknameKeyDown}
          />
        </label>

        <div className="entry-actions">
          <button
            type="button"
            className="entry-btn entry-btn-ghost"
            disabled={generating}
            onClick={() => {
              void entryStore.generateAvatar()
            }}
          >
            {generating ? 'Generating' : 'Generate'}
          </button>
          <button
            type="submit"
            className="entry-btn entry-btn-start"
            disabled={!canStart || generating}
          >
            Start
          </button>
        </div>

        <p className={statusClass()} role="status">
          {falLine()}
        </p>
      </form>
    </div>
  )
})
