import { observer } from 'mobx-react-lite'
import type { CSSProperties, FormEvent, KeyboardEvent } from 'react'
import { useEffect, useRef } from 'react'
import { entryPreview, EntryPreviewPipeline } from '../entry/preview'
import { entryStore, NICKNAME_LIMIT } from '../entry/store'
import { leaderboardStore } from '../leaderboard/store'

function falLine(): string {
  const { falStatus, selectedSlot, totalDrivers } = entryStore
  if (selectedSlot.status === 'generating') {
    return `Generating ${selectedSlot.driver.name}…`
  }
  if (selectedSlot.error) {
    return selectedSlot.error
  }
  if (falStatus === 'missing') {
    return `Bundled roster · ${totalDrivers} drivers (reroll needs fal.ai key)`
  }
  if (falStatus === 'ready') {
    return `Bundled roster · ${totalDrivers} drivers`
  }
  return 'Checking fal.ai…'
}

function statusClass(): string {
  const { falStatus, selectedSlot } = entryStore
  if (selectedSlot.error) {
    return 'entry-status is-warn'
  }
  if (falStatus === 'missing') {
    return 'entry-status is-warn'
  }
  return 'entry-status is-ok'
}

/** Live head-tracked cell of the 5×5 atlas, mirror-style: head left → avatar left. */
function faceStyle(atlasUrl: string): CSSProperties {
  const { col, row, yaw, pitch } = entryPreview
  const nudgeX = Math.max(-1, Math.min(1, yaw)) * -2
  const nudgeY = Math.max(-1, Math.min(1, pitch)) * -1.5
  return {
    backgroundImage: `url(${atlasUrl})`,
    backgroundPosition: `${col * 25}% ${row * 25}%`,
    transform: `translate(${nudgeX}%, ${nudgeY}%)`,
  }
}

export const EntryScreen = observer(function EntryScreen() {
  const {
    nickname,
    canStart,
    selectedSlot,
    selectedDriverId,
    slots,
    previewAtlasUrl,
  } = entryStore
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    void entryStore.checkFal()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    const pipeline = new EntryPreviewPipeline()
    void pipeline.start(video)
    return () => pipeline.stop()
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

  const selected = selectedSlot.driver
  const previewReady = selectedSlot.status === 'ready' && previewAtlasUrl
  const previewBusy = selectedSlot.status === 'generating'

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

        {/* Invisible camera feed driving the avatar preview — the wow moment. */}
        <video ref={videoRef} className="entry-cam" playsInline muted />

        <div className="entry-avatar" aria-hidden={!previewReady}>
          {previewReady ? (
            <div
              className="entry-avatar-face"
              style={faceStyle(previewAtlasUrl)}
            />
          ) : (
            <div className="entry-avatar-empty" aria-hidden="true">
              <span className="entry-brick entry-brick-red" />
              <span className="entry-brick entry-brick-white" />
              <span className="entry-brick entry-brick-mint" />
              <span className="entry-brick entry-brick-asphalt" />
            </div>
          )}
        </div>

        <div className="entry-picker" role="listbox" aria-label="Driver select">
          <div className="entry-picker-track">
            {slots.map((slot) => {
              const active = slot.driver.id === selectedDriverId
              const ready = slot.status === 'ready' && slot.atlasUrl
              return (
                <button
                  key={slot.driver.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`entry-picker-cell${active ? ' is-selected' : ''}${slot.status === 'generating' ? ' is-busy' : ''}`}
                  title={`${slot.driver.name} · ${slot.driver.team}`}
                  onClick={() => {
                    entryStore.selectDriver(slot.driver.id)
                  }}
                >
                  {ready ? (
                    <span
                      className="entry-picker-face"
                      style={{ backgroundImage: `url(${slot.atlasUrl})` }}
                    />
                  ) : (
                    <span className="entry-picker-fallback">
                      {slot.status === 'generating' ? '…' : slot.driver.number}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <p className="entry-picker-name">
          <span className="entry-picker-number">#{selected.number}</span>
          {selected.name}
          <span className="entry-picker-team">{selected.team}</span>
        </p>

        <label className="entry-field" htmlFor="entry-nickname">
          <span>Nickname</span>
          <input
            id="entry-nickname"
            name="nickname"
            type="text"
            autoComplete="nickname"
            autoFocus
            maxLength={NICKNAME_LIMIT}
            placeholder="Your name"
            value={nickname}
            disabled={previewBusy}
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
            disabled={
              entryStore.falStatus !== 'ready' ||
              selectedSlot.status === 'generating'
            }
            onClick={() => {
              void entryStore.regenerateSelected()
            }}
          >
            {selectedSlot.status === 'generating' ? 'Generating' : 'Reroll'}
          </button>
          <button
            type="submit"
            className="entry-btn entry-btn-start"
            disabled={!canStart}
          >
            Start
          </button>
        </div>

        <button
          type="button"
          className="entry-btn entry-btn-ghost"
          onClick={() => {
            leaderboardStore.toggle()
          }}
        >
          Leaderboard
        </button>

        <p className={statusClass()} role="status">
          {falLine()}
        </p>
      </form>
    </div>
  )
})
