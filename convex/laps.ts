import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'

const NICKNAME_MAX = 20
const MIN_LAP_MS = 15_000
const MAX_LAP_MS = 30 * 60 * 1000
const DEFAULT_TRACK = 'monza'
const LIST_SCAN = 400

function cleanNickname(value: string): string {
  return value.trim().slice(0, NICKNAME_MAX)
}

/** Fastest lap per nickname, already sorted by time. */
function uniqueBest<
  T extends { nickname: string; lapMs: number; createdAt: number },
>(rows: T[], limit: number): T[] {
  const seen = new Set<string>()
  const best: T[] = []
  for (const row of rows) {
    const key = row.nickname.trim().toLowerCase()
    if (!key || seen.has(key)) {
      continue
    }
    seen.add(key)
    best.push(row)
    if (best.length >= limit) {
      break
    }
  }
  return best
}

export const submit = mutationGeneric({
  args: {
    nickname: v.string(),
    lapMs: v.number(),
    trackId: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const nickname = cleanNickname(args.nickname)
    const lapMs = Math.round(args.lapMs)
    if (nickname.length === 0) {
      throw new Error('Nickname required')
    }
    if (lapMs < MIN_LAP_MS || lapMs > MAX_LAP_MS) {
      throw new Error('Lap time out of range')
    }

    const trackId = (args.trackId ?? DEFAULT_TRACK).trim() || DEFAULT_TRACK
    const avatarUrl =
      typeof args.avatarUrl === 'string' &&
      (args.avatarUrl.startsWith('http://') ||
        args.avatarUrl.startsWith('https://') ||
        args.avatarUrl.startsWith('/'))
        ? args.avatarUrl
        : undefined

    return await ctx.db.insert('laps', {
      nickname,
      lapMs,
      trackId,
      avatarUrl,
      createdAt: Date.now(),
    })
  },
})

export const listBest = queryGeneric({
  args: {
    trackId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trackId = (args.trackId ?? DEFAULT_TRACK).trim() || DEFAULT_TRACK
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 50)
    const rows = await ctx.db
      .query('laps')
      .withIndex('by_track_and_time', (q) => q.eq('trackId', trackId))
      .take(LIST_SCAN)
    return uniqueBest(rows, limit)
  },
})
