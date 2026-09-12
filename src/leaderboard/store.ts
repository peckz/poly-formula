import { makeAutoObservable, runInAction } from 'mobx'
import { entryStore } from '../entry/store'
import { fetchBestLaps, isConvexConfigured, postLap } from './convex'
import {
  DEFAULT_TRACK_ID,
  LEADERBOARD_LIMIT,
  bestLaps,
  publicAvatarUrl,
  type LapRecord,
} from './format'

const LOCAL_KEY = 'poly-formula.laps.v1'
const LOCAL_CAP = 100

export type LeaderboardSource = 'convex' | 'local'
export type LeaderboardStatus = 'idle' | 'loading' | 'ready' | 'error'

function readLocal(): LapRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isLapRecord)
  } catch {
    return []
  }
}

function isLapRecord(value: unknown): value is LapRecord {
  if (!value || typeof value !== 'object') {
    return false
  }
  const row = value as LapRecord
  return (
    typeof row.id === 'string' &&
    typeof row.nickname === 'string' &&
    typeof row.lapMs === 'number' &&
    typeof row.trackId === 'string' &&
    typeof row.createdAt === 'number'
  )
}

function writeLocal(rows: LapRecord[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows.slice(-LOCAL_CAP)))
  } catch {
    // Quota or private mode — board still lives in memory this session.
  }
}

class LeaderboardStore {
  open = false
  rows: LapRecord[] = []
  source: LeaderboardSource = isConvexConfigured() ? 'convex' : 'local'
  status: LeaderboardStatus = 'ready'
  lastError: string | null = null
  configured = isConvexConfigured()

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
    this.rows = bestLaps(readLocal(), LEADERBOARD_LIMIT)
  }

  toggle() {
    this.open = !this.open
    if (this.open) {
      void this.refresh()
    }
  }

  close() {
    this.open = false
  }

  async refresh() {
    if (!this.configured) {
      this.rows = bestLaps(readLocal(), LEADERBOARD_LIMIT)
      this.source = 'local'
      this.status = 'ready'
      this.lastError = null
      return
    }

    this.status = 'loading'
    try {
      const remote = await fetchBestLaps()
      runInAction(() => {
        if (remote) {
          this.rows = remote
          this.source = 'convex'
          this.status = 'ready'
          this.lastError = null
        } else {
          this.rows = bestLaps(readLocal(), LEADERBOARD_LIMIT)
          this.source = 'local'
          this.status = 'ready'
          this.lastError = 'Convex unavailable. Showing local board.'
        }
      })
    } catch (caught) {
      runInAction(() => {
        this.rows = bestLaps(readLocal(), LEADERBOARD_LIMIT)
        this.source = 'local'
        this.status = 'error'
        this.lastError =
          caught instanceof Error ? caught.message : 'Convex request failed'
      })
    }
  }

  /** Record a finished lap. Convex when configured; always keep a local copy. */
  async submitLap(lapMs: number) {
    const nickname = entryStore.trimmedNickname
    if (!nickname) {
      return
    }

    const avatarUrl = publicAvatarUrl(entryStore.previewAtlasUrl)
    const record: LapRecord = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nickname,
      lapMs,
      trackId: DEFAULT_TRACK_ID,
      avatarUrl,
      createdAt: Date.now(),
    }

    const local = [...readLocal(), record]
    writeLocal(local)
    this.rows = bestLaps(local, LEADERBOARD_LIMIT)
    this.source = this.configured ? this.source : 'local'

    if (!this.configured) {
      return
    }

    try {
      await postLap({
        nickname,
        lapMs,
        trackId: DEFAULT_TRACK_ID,
        avatarUrl,
      })
      await this.refresh()
    } catch (caught) {
      runInAction(() => {
        this.source = 'local'
        this.status = 'error'
        this.lastError =
          caught instanceof Error
            ? caught.message
            : 'Could not sync lap to Convex'
      })
    }
  }
}

export const leaderboardStore = new LeaderboardStore()
