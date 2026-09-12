import type * as THREE from 'three'

/**
 * Supported sponsor brands for circuit billboards.
 */
export const SPONSOR_BRANDS = [
  'Grok Bot',
  'Firecrawl',
  'Exa',
  'Wonder',
  'Daytona',
  'Convex',
  'Wispr Flow',
  'Fal.ai',
  'x.ai',
  'Render',
] as const

export type SponsorBrand = (typeof SPONSOR_BRANDS)[number]

/**
 * Tree species in Monza park visual language.
 */
export type TreeType = 'poplar' | 'oak'

/**
 * Scenery object category.
 */
export type SceneryItemType =
  | 'tree'
  | 'grandstand'
  | 'billboard'
  | 'tire_stack'
  | 'runoff_patch'
  | 'gravel_trap'

/**
 * Named track landmark snap target for Monza circuit scaffolding.
 */
export type SnapMarkerName =
  | 'SF' // Start / Finish straight
  | 'Rettifilo' // Prima Variante (T1 chicane)
  | 'CurvaGrande' // Curva Grande / Biassono
  | 'Lesmo' // Curva di Lesmo
  | 'Ascari' // Variante Ascari
  | 'Parabolica' // Curva Parabolica (Curva Alboreto)
  | string

export interface SnapTarget {
  name: SnapMarkerName
  label: string
  description: string
  position: [number, number, number]
  rotationY: number
  associatedItemIds: string[]
}

export interface SceneryPlacement {
  id: string
  type: SceneryItemType
  subtype?: TreeType | string
  position: [number, number, number]
  rotationY?: number
  scale?: [number, number, number] | number
  snapMarker?: SnapMarkerName
  brand?: SponsorBrand
  properties?: Record<string, unknown>
}

export interface LandscapeOptions {
  enableLighting?: boolean
  enableFog?: boolean
  enableGround?: boolean
  placements?: SceneryPlacement[]
  customSponsorTextures?: Partial<Record<SponsorBrand, THREE.Texture>>
}

export interface LandscapeHandle {
  group: THREE.Group
  snapTargets: SnapTarget[]
  placements: SceneryPlacement[]
  dispose: () => void
  getSnapTarget: (name: SnapMarkerName) => SnapTarget | undefined
  rebindSnapTarget: (name: SnapMarkerName, position: [number, number, number], rotationY?: number) => void
}
