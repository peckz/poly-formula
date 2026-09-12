import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  laps: defineTable({
    nickname: v.string(),
    lapMs: v.number(),
    trackId: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_track_and_time', ['trackId', 'lapMs']),
})
