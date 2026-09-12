export const DEFAULT_TRACK_ID = 'monza'
export const LEADERBOARD_LIMIT = 50
export const MIN_LAP_MS = 15_000
export const MIN_LAP_FRACTION = 0.75

export type LapRecord = {
  id: string
  nickname: string
  lapMs: number
  trackId: string
  avatarUrl?: string
  createdAt: number
}

/** F1-style `m:ss.mmm`. */
export function formatLapTime(ms: number): string {
  const clamped = Math.max(0, Math.round(ms))
  const minutes = Math.floor(clamped / 60_000)
  const seconds = Math.floor((clamped % 60_000) / 1000)
  const millis = clamped % 1000
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

export function bestLaps(rows: LapRecord[], limit: number): LapRecord[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.lapMs !== b.lapMs) {
      return a.lapMs - b.lapMs
    }
    return a.createdAt - b.createdAt
  })
  const seen = new Set<string>()
  const out: LapRecord[] = []
  for (const row of sorted) {
    const key = row.nickname.trim().toLowerCase()
    if (!key || seen.has(key)) {
      continue
    }
    seen.add(key)
    out.push(row)
    if (out.length >= limit) {
      break
    }
  }
  return out
}

export function sameNickname(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function publicAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // Bundled driver atlases live under /sprites/… on the same origin.
  if (url.startsWith('/')) {
    return url
  }
  return undefined
}
