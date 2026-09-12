import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import {
  DEFAULT_TRACK_ID,
  LEADERBOARD_LIMIT,
  type LapRecord,
} from './format'

const submitRef = makeFunctionReference<
  'mutation',
  {
    nickname: string
    lapMs: number
    trackId?: string
    avatarUrl?: string
  },
  string
>('laps:submit')

const listBestRef = makeFunctionReference<
  'query',
  { trackId?: string; limit?: number },
  Array<{
    _id: string
    nickname: string
    lapMs: number
    trackId: string
    avatarUrl?: string
    createdAt: number
  }>
>('laps:listBest')

function readConvexUrl(): string | null {
  const raw = import.meta.env.VITE_CONVEX_URL
  if (typeof raw !== 'string') {
    return null
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return trimmed
  } catch {
    return null
  }
}

const convexUrl = readConvexUrl()

export function isConvexConfigured(): boolean {
  return convexUrl !== null
}

let client: ConvexHttpClient | null = null

function getClient(): ConvexHttpClient | null {
  if (!convexUrl) {
    return null
  }
  if (!client) {
    try {
      client = new ConvexHttpClient(convexUrl)
    } catch {
      return null
    }
  }
  return client
}

export async function fetchBestLaps(
  trackId = DEFAULT_TRACK_ID,
  limit = LEADERBOARD_LIMIT,
): Promise<LapRecord[] | null> {
  const convex = getClient()
  if (!convex) {
    return null
  }
  const rows = await convex.query(listBestRef, { trackId, limit })
  return rows.map((row) => ({
    id: row._id,
    nickname: row.nickname,
    lapMs: row.lapMs,
    trackId: row.trackId,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
  }))
}

export async function postLap(input: {
  nickname: string
  lapMs: number
  trackId?: string
  avatarUrl?: string
}): Promise<boolean> {
  const convex = getClient()
  if (!convex) {
    return false
  }
  await convex.mutation(submitRef, input)
  return true
}
