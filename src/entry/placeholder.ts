const SKY = '#a9c3e0'
const FACE = '#c4a07a'
const SUIT = '#a30f14'
const VISOR = '#141418'
const HELMETS = ['#d0181c', '#f2f2f0', '#2a2a2e'] as const
const ACCENTS = ['#6cab51', '#f2f2f0', '#d0181c'] as const

type Block = {
  x: number
  y: number
  w: number
  h: number
  fill: string
}

function hashSeed(seed: string): number {
  let hash = 2166136261
  const text = seed.trim().toLowerCase() || 'racer'
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Crisp 16×16 brick-face portrait, seeded from the nickname. */
export function buildPlaceholderAvatar(seed: string): string {
  const hash = hashSeed(seed)
  const helmet = HELMETS[hash % HELMETS.length]
  const accent = ACCENTS[(hash >>> 3) % ACCENTS.length]
  const blocks: Block[] = [
    { x: 0, y: 0, w: 16, h: 16, fill: SKY },
    { x: 4, y: 2, w: 8, h: 2, fill: helmet },
    { x: 3, y: 4, w: 10, h: 5, fill: helmet },
    { x: 4, y: 5, w: 8, h: 3, fill: VISOR },
    { x: 5, y: 5, w: 2, h: 1, fill: accent },
    { x: 5, y: 8, w: 6, h: 2, fill: FACE },
    { x: 5, y: 10, w: 6, h: 1, fill: helmet },
    { x: 4, y: 11, w: 8, h: 4, fill: SUIT },
    { x: 7, y: 12, w: 2, h: 3, fill: accent },
  ]
  const body = blocks
    .map(
      (block) =>
        `<rect x="${block.x}" y="${block.y}" width="${block.w}" height="${block.h}" fill="${block.fill}"/>`,
    )
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${body}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
