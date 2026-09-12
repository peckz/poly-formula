import * as THREE from 'three'

/**
 * Monza Park low-poly / PS1 visual palette: Italy midday heat.
 * Soft, warm, approachable: clear Italian blue sky, gentle heat haze,
 * warm olive grass, and muted (not harsh) dark tones. No stark neon or pitch blacks.
 * Uses Lambert / vertex coloring; no PBR roughness/metalness overhead.
 */
export const LANDSCAPE_COLORS = {
  sky: 0x82c5eb, // #82C5EB - Clear soft Italian midday blue sky
  fog: 0xb8d4e2, // #B8D4E2 - Soft summer heat haze
  grass: 0x5b7e3e, // #5B7E3E - Warm olive Monza park grass
  grassDark: 0x4e6e34, // Subtle darker olive variation
  grassLight: 0x6a8f48, // Sunlit golden-olive grass highlight
  canopy: 0x324f2a, // #324F2A - Italian cypress & Lombardy poplar canopy
  canopyOak: 0x3a5a32, // #3A5A32 - Broadleaf stone oak canopy
  trunk: 0x634839, // #634839 - Warm sunbaked tree trunk
  runoffAsphalt: 0x44454b, // #44454B - Warm grey runoff asphalt apron
  gravel: 0xc8b892, // #C8B892 - Warm Italian golden gravel trap bed
  grandstand: 0xede8dc, // #EDE8DC - Sunlit warm cream concrete grandstand
  grandstandRedBand: 0xba202e, // #BA202E - Italian racing red accent band
  grandstandRoof: 0x5c626a, // #5C626A - Muted slate grey roof
  tires: 0x2b2b30, // #2B2B30 - Muted charcoal rubber tires (no harsh black)
  tiresWhite: 0xe5e2db, // #E5E2DB - Soft warm white tire stripe
  tireBelt: 0x3e3e44, // #3E3E44 - Muted belt strapping
  billboardField: 0xf4f1ea, // #F4F1EA - Warm off-white billboard canvas
  billboardFrame: 0xdcd8d0, // #DCD8D0 - Warm galvanized aluminum frame
  billboardPosts: 0x545860, // #545860 - Warm muted steel support pylons
  trackAsphalt: 0x3a3e46, // #3A3E46 - Warm grey ribbon placeholder
  kerbRed: 0xba202e, // Monza kerb red
  kerbWhite: 0xf4f1ea, // Monza kerb soft white
} as const

/**
 * Shared MeshLambertMaterial instances for maximum render efficiency.
 */
export class LandscapeMaterials {
  readonly grass: THREE.MeshLambertMaterial
  readonly grassVertex: THREE.MeshLambertMaterial
  readonly canopyPoplar: THREE.MeshLambertMaterial
  readonly canopyOak: THREE.MeshLambertMaterial
  readonly trunk: THREE.MeshLambertMaterial
  readonly runoffAsphalt: THREE.MeshLambertMaterial
  readonly gravel: THREE.MeshLambertMaterial
  readonly grandstandBody: THREE.MeshLambertMaterial
  readonly grandstandRedBand: THREE.MeshLambertMaterial
  readonly grandstandRoof: THREE.MeshLambertMaterial
  readonly tireBlack: THREE.MeshLambertMaterial
  readonly tireWhite: THREE.MeshLambertMaterial
  readonly tireBelt: THREE.MeshLambertMaterial
  readonly billboardFrame: THREE.MeshLambertMaterial
  readonly billboardPosts: THREE.MeshLambertMaterial
  readonly billboardField: THREE.MeshLambertMaterial

  private allMaterials: THREE.Material[] = []

  constructor() {
    this.grass = this.createLambert(LANDSCAPE_COLORS.grass)
    this.grassVertex = new THREE.MeshLambertMaterial({ vertexColors: true })
    this.allMaterials.push(this.grassVertex)

    this.canopyPoplar = this.createLambert(LANDSCAPE_COLORS.canopy)
    this.canopyOak = this.createLambert(LANDSCAPE_COLORS.canopyOak)
    this.trunk = this.createLambert(LANDSCAPE_COLORS.trunk)
    this.runoffAsphalt = this.createLambert(LANDSCAPE_COLORS.runoffAsphalt)
    this.gravel = this.createLambert(LANDSCAPE_COLORS.gravel)
    this.grandstandBody = this.createLambert(LANDSCAPE_COLORS.grandstand)
    this.grandstandRedBand = this.createLambert(LANDSCAPE_COLORS.grandstandRedBand)
    this.grandstandRoof = this.createLambert(LANDSCAPE_COLORS.grandstandRoof)
    this.tireBlack = this.createLambert(LANDSCAPE_COLORS.tires)
    this.tireWhite = this.createLambert(LANDSCAPE_COLORS.tiresWhite)
    this.tireBelt = this.createLambert(LANDSCAPE_COLORS.tireBelt)
    this.billboardFrame = this.createLambert(LANDSCAPE_COLORS.billboardFrame)
    this.billboardPosts = this.createLambert(LANDSCAPE_COLORS.billboardPosts)
    this.billboardField = this.createLambert(LANDSCAPE_COLORS.billboardField)
  }

  private createLambert(color: number): THREE.MeshLambertMaterial {
    const mat = new THREE.MeshLambertMaterial({ color })
    this.allMaterials.push(mat)
    return mat
  }

  dispose(): void {
    for (const mat of this.allMaterials) {
      mat.dispose()
    }
  }
}
