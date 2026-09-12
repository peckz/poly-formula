import * as THREE from 'three'
import { SPONSOR_BRANDS, type SponsorBrand } from '../types.ts'

/**
 * Brand visual styling configuration for procedural billboard textures.
 */
interface BrandTheme {
  name: string
  subtitle?: string
  bg: string
  fg: string
  accent: string
  badgeText?: string
  iconType: 'grok' | 'fire' | 'neural' | 'star' | 'speed' | 'hex' | 'wave' | 'lightning' | 'x' | 'cube'
}

const BRAND_THEMES: Record<SponsorBrand, BrandTheme> = {
  'Grok Bot': {
    name: 'GROK BOT',
    subtitle: 'REAL-TIME REASONING',
    bg: '#0c0f14',
    fg: '#ffffff',
    accent: '#38bdf8',
    badgeText: 'AI',
    iconType: 'grok',
  },
  Firecrawl: {
    name: 'FIRECRAWL',
    subtitle: 'WEB DATA API',
    bg: '#140c0c',
    fg: '#ffffff',
    accent: '#ff5722',
    badgeText: 'API',
    iconType: 'fire',
  },
  Exa: {
    name: 'EXA',
    subtitle: 'SEARCH ENGINE FOR AI',
    bg: '#0a1017',
    fg: '#ffffff',
    accent: '#60a5fa',
    badgeText: 'NEURAL',
    iconType: 'neural',
  },
  Wonder: {
    name: 'WONDER',
    subtitle: '3D WORLD GENERATION',
    bg: '#120d1a',
    fg: '#ffffff',
    accent: '#c084fc',
    badgeText: 'GEN-AI',
    iconType: 'star',
  },
  Daytona: {
    name: 'DAYTONA',
    subtitle: 'DEV ENVIRONMENT ENGINE',
    bg: '#0f1412',
    fg: '#ffffff',
    accent: '#22c55e',
    badgeText: 'SPEED',
    iconType: 'speed',
  },
  Convex: {
    name: 'CONVEX',
    subtitle: 'REACTIVE BACKEND',
    bg: '#16120a',
    fg: '#ffffff',
    accent: '#f59e0b',
    badgeText: 'SYNC',
    iconType: 'hex',
  },
  'Wispr Flow': {
    name: 'WISPR FLOW',
    subtitle: 'VOICE INTELLIGENCE',
    bg: '#0b1317',
    fg: '#ffffff',
    accent: '#2dd4bf',
    badgeText: 'VOICE',
    iconType: 'wave',
  },
  'Fal.ai': {
    name: 'fal.ai',
    subtitle: 'LIGHTNING MEDIA INFERENCE',
    bg: '#140b17',
    fg: '#ffffff',
    accent: '#f43f5e',
    badgeText: 'FAST',
    iconType: 'lightning',
  },
  'x.ai': {
    name: 'x.ai',
    subtitle: 'UNDERSTAND THE UNIVERSE',
    bg: '#090a0f',
    fg: '#ffffff',
    accent: '#e2e8f0',
    badgeText: 'FRONTIER',
    iconType: 'x',
  },
  Render: {
    name: 'RENDER',
    subtitle: 'CLOUD APPLICATION HOSTING',
    bg: '#0b111a',
    fg: '#ffffff',
    accent: '#3b82f6',
    badgeText: 'CLOUD',
    iconType: 'cube',
  },
}

function drawBrandIcon(ctx: CanvasRenderingContext2D, iconType: BrandTheme['iconType'], cx: number, cy: number, size: number, color: string): void {
  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 4

  switch (iconType) {
    case 'grok': {
      // Angular grok slash / box
      ctx.beginPath()
      ctx.moveTo(cx - size * 0.4, cy - size * 0.4)
      ctx.lineTo(cx + size * 0.4, cy - size * 0.4)
      ctx.lineTo(cx + size * 0.2, cy + size * 0.4)
      ctx.lineTo(cx - size * 0.4, cy + size * 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#0c0f14'
      ctx.fillRect(cx - size * 0.1, cy - size * 0.25, size * 0.2, size * 0.5)
      break
    }
    case 'fire': {
      // Fire flame silhouette
      ctx.beginPath()
      ctx.moveTo(cx, cy - size * 0.5)
      ctx.quadraticCurveTo(cx + size * 0.4, cy - size * 0.1, cx + size * 0.35, cy + size * 0.35)
      ctx.quadraticCurveTo(cx, cy + size * 0.55, cx - size * 0.35, cy + size * 0.35)
      ctx.quadraticCurveTo(cx - size * 0.4, cy - size * 0.1, cx, cy - size * 0.5)
      ctx.fill()
      break
    }
    case 'neural': {
      // Neural mesh / target
      ctx.beginPath()
      ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'star': {
      // 4-point starburst
      ctx.beginPath()
      ctx.moveTo(cx, cy - size * 0.5)
      ctx.quadraticCurveTo(cx, cy, cx + size * 0.5, cy)
      ctx.quadraticCurveTo(cx, cy, cx, cy + size * 0.5)
      ctx.quadraticCurveTo(cx, cy, cx - size * 0.5, cy)
      ctx.quadraticCurveTo(cx, cy, cx, cy - size * 0.5)
      ctx.fill()
      break
    }
    case 'speed': {
      // Racing double chevron / stripes
      ctx.beginPath()
      ctx.moveTo(cx - size * 0.4, cy + size * 0.4)
      ctx.lineTo(cx, cy - size * 0.4)
      ctx.lineTo(cx + size * 0.4, cy + size * 0.4)
      ctx.lineTo(cx + size * 0.2, cy + size * 0.4)
      ctx.lineTo(cx, cy - size * 0.1)
      ctx.lineTo(cx - size * 0.2, cy + size * 0.4)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'hex': {
      // Hexagon node
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3
        const hx = cx + size * 0.4 * Math.cos(angle)
        const hy = cy + size * 0.4 * Math.sin(angle)
        if (i === 0) {
          ctx.moveTo(hx, hy)
        } else {
          ctx.lineTo(hx, hy)
        }
      }
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'wave': {
      // Audio sound wave bars
      const bars = [-14, -7, 0, 7, 14]
      const heights = [0.3, 0.6, 0.9, 0.6, 0.3]
      for (let i = 0; i < bars.length; i++) {
        const h = size * heights[i]
        ctx.fillRect(cx + bars[i] - 2, cy - h / 2, 4, h)
      }
      break
    }
    case 'lightning': {
      // Lightning bolt
      ctx.beginPath()
      ctx.moveTo(cx + size * 0.1, cy - size * 0.45)
      ctx.lineTo(cx - size * 0.3, cy + size * 0.05)
      ctx.lineTo(cx, cy + size * 0.05)
      ctx.lineTo(cx - size * 0.1, cy + size * 0.45)
      ctx.lineTo(cx + size * 0.3, cy - size * 0.05)
      ctx.lineTo(cx, cy - size * 0.05)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'x': {
      // Bold x.ai mark
      ctx.beginPath()
      ctx.moveTo(cx - size * 0.35, cy - size * 0.4)
      ctx.lineTo(cx + size * 0.35, cy + size * 0.4)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx + size * 0.35, cy - size * 0.4)
      ctx.lineTo(cx - size * 0.35, cy + size * 0.4)
      ctx.stroke()
      break
    }
    case 'cube': {
      // Isometric low-poly cube
      ctx.beginPath()
      ctx.moveTo(cx, cy - size * 0.4)
      ctx.lineTo(cx + size * 0.35, cy - size * 0.2)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx - size * 0.35, cy - size * 0.2)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(cx - size * 0.35, cy - size * 0.2)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx, cy + size * 0.4)
      ctx.lineTo(cx - size * 0.35, cy + size * 0.2)
      ctx.closePath()
      ctx.fill()
      break
    }
  }

  ctx.restore()
}

/**
 * Generates a clean 512x128 monochrome/white-on-dark wordmark billboard canvas texture.
 */
export function generateSponsorCanvas(brand: SponsorBrand): HTMLCanvasElement | null {
  if (typeof document === 'undefined') {
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }

  const theme = BRAND_THEMES[brand] || {
    name: brand.toUpperCase(),
    bg: '#11141a',
    fg: '#ffffff',
    accent: '#38bdf8',
    iconType: 'cube' as const,
  }

  // 1. Dark field background with subtle gradient
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, 512, 128)

  // 2. High-contrast perimeter border
  ctx.strokeStyle = '#272c38'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, 508, 124)

  // 3. Top / side motorsport accent stripe
  ctx.fillStyle = theme.accent
  ctx.fillRect(0, 0, 10, 128)
  ctx.fillRect(502, 0, 10, 128)
  ctx.fillRect(0, 0, 512, 5)

  // 4. Draw brand icon badge on left
  drawBrandIcon(ctx, theme.iconType, 56, 64, 46, theme.accent)

  // 5. Typography: Main Brand Name
  ctx.fillStyle = theme.fg
  ctx.font = '900 40px "Inter", "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(theme.name, 98, 54)

  // 6. Subtitle / descriptor
  if (theme.subtitle) {
    ctx.fillStyle = '#8f9bb3'
    ctx.font = '600 13px "Inter", "Helvetica Neue", Arial, sans-serif'
    ctx.fillText(theme.subtitle, 100, 84)
  }

  // 7. Right Pill Badge
  if (theme.badgeText) {
    const badgeX = 425
    const badgeY = 64
    ctx.fillStyle = '#1e2430'
    ctx.beginPath()
    ctx.roundRect(badgeX - 35, badgeY - 14, 70, 28, 6)
    ctx.fill()
    ctx.strokeStyle = theme.accent
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = theme.fg
    ctx.font = '800 12px "Inter", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(theme.badgeText, badgeX, badgeY + 1)
  }

  return canvas
}

/**
 * Texture repository for sponsor billboard meshes.
 * Supports custom drop-in textures or procedural defaults.
 */
export class SponsorTextureManager {
  private textures = new Map<SponsorBrand, THREE.Texture>()

  constructor(customTextures?: Partial<Record<SponsorBrand, THREE.Texture>>) {
    if (customTextures) {
      for (const [brand, tex] of Object.entries(customTextures)) {
        if (tex) {
          this.textures.set(brand as SponsorBrand, tex)
        }
      }
    }
  }

  /**
   * Returns texture for brand, creating procedural canvas if not cached.
   */
  getTexture(brand: SponsorBrand): THREE.Texture {
    let texture = this.textures.get(brand)
    if (!texture) {
      const canvas = generateSponsorCanvas(brand)
      if (canvas) {
        texture = new THREE.CanvasTexture(canvas)
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        texture.anisotropy = 4
        texture.colorSpace = THREE.SRGBColorSpace
      } else {
        // Fallback texture for headless/Node test environments
        texture = new THREE.Texture()
      }
      this.textures.set(brand, texture)
    }
    return texture
  }

  /**
   * Pre-generate all sponsor brand textures for instant billboard rendering.
   */
  preloadAll(): void {
    for (const brand of SPONSOR_BRANDS) {
      this.getTexture(brand)
    }
  }

  dispose(): void {
    for (const tex of this.textures.values()) {
      tex.dispose()
    }
    this.textures.clear()
  }
}
