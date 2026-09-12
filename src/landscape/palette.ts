import * as THREE from 'three'

/**
 * Monza Park low-poly / PS1 visual palette matched to the reference aesthetic:
 * - Soft pale desaturated sky blue (#8bb5ca / #82abcb)
 * - Warm mint / sage grass (#82b87c / #8dbf84) near track
 * - Olive/forest green faceted hills (#4d7540 / #3d6032) in distance
 * - Gentle midday sunlight (#fff9ee) with soft grey ambient fill (#98b0be)
 * - Low-poly blocky trees: warm brown trunks (#6b4f3b) + olive/forest blocky canopies (#446b38 / #527c44)
 * - Grandstands: light sky blue / white tiered steps (#b8e2f2 / #ffffff / #f0f4f8) + dark roof (#2e343d) + Italian red band (#b82c35)
 * - Sponsor bridge/gantry: warm terracotta/coral (#e87a54) with golden-yellow pillars (#f2cc5b)
 * - Fence posts & railings: clean low-poly posts (#44505c / #d8e0e6)
 * - Low-poly boulders: grey faceted rocks (#94a3af)
 * - Tires: muted dark charcoal (#282a30) with soft white stripes (#e2e6ea)
 * - No stark neon, no pitch blacks, no photoreal PBR.
 */
export const LANDSCAPE_COLORS = {
  sky: 0x82abcb, // #82ABCB - Soft pale desaturated Italian sky blue
  fog: 0xa4c2d4, // #A4C2D4 - Soft distant atmospheric haze
  grass: 0x82b87c, // #82B87C - Warm mint / sage green trackside grass
  grassDark: 0x73a56e, // Subtle darker mint variation
  grassLight: 0x92c78c, // Sunlit sage highlight
  hills: 0x4d7540, // #4D7540 - Faceted olive hill green
  hillsDark: 0x3d6032, // #3D6032 - Deep forest hill green
  canopy: 0x446b38, // #446B38 - Blocky low-poly tree canopy
  canopyOak: 0x527c44, // #527C44 - Warm sage-oak tree canopy
  trunk: 0x6b4f3b, // #6B4F3B - Low-poly brown tree trunk
  rockGrey: 0x94a3af, // #94A3AF - Faceted grey trackside boulder
  gantryArch: 0xe87a54, // #E87A54 - Warm coral / terracotta bridge header
  gantryPillars: 0xf2cc5b, // #F2CC5B - Golden yellow gantry support columns
  grandstand: 0xf0f4f8, // #F0F4F8 - Off-white grandstand base
  grandstandBlue: 0x98d4ec, // #98D4EC - Light sky blue seat tiers (reference style)
  grandstandRedBand: 0xb82c35, // #B82C35 - Italian racing red accent trim
  grandstandRoof: 0x2e343d, // #2E343D - Muted dark charcoal roof canopy
  fencePosts: 0x44505c, // #44505C - Trackside safety barrier posts
  fenceRailing: 0xc4d0d8, // #C4D0D8 - Soft silver barrier wire
  runoffAsphalt: 0x44464d, // #44464D - Warm charcoal runoff asphalt apron
  gravel: 0xc8b892, // #C8B892 - Warm golden gravel bed
  tires: 0x282a30, // #282A30 - Muted dark charcoal tire barrier
  tiresWhite: 0xe2e6ea, // #E2E6EA - Soft white tire stripe
  tireBelt: 0x3a3d45, // #3A3D45 - Muted belt strapping
  billboardField: 0xf4f2ea, // #F4F2EA - Soft warm billboard face
  billboardFrame: 0xd4d8dc, // #D4D8DC - Galvanized frame
  billboardPosts: 0x4e5460, // #4E5460 - Muted steel support posts
  trackAsphalt: 0x383a42, // #383A42 - Charcoal track ribbon
  kerbRed: 0xb82c35, // Monza kerb red
  kerbWhite: 0xf0f4f8, // Monza kerb white
} as const

/**
 * Shared MeshLambertMaterial instances for maximum render efficiency.
 */
export class LandscapeMaterials {
  readonly grass: THREE.MeshLambertMaterial
  readonly grassVertex: THREE.MeshLambertMaterial
  readonly hills: THREE.MeshLambertMaterial
  readonly hillsDark: THREE.MeshLambertMaterial
  readonly canopyPoplar: THREE.MeshLambertMaterial
  readonly canopyOak: THREE.MeshLambertMaterial
  readonly trunk: THREE.MeshLambertMaterial
  readonly rockGrey: THREE.MeshLambertMaterial
  readonly gantryArch: THREE.MeshLambertMaterial
  readonly gantryPillars: THREE.MeshLambertMaterial
  readonly runoffAsphalt: THREE.MeshLambertMaterial
  readonly gravel: THREE.MeshLambertMaterial
  readonly grandstandBody: THREE.MeshLambertMaterial
  readonly grandstandBlue: THREE.MeshLambertMaterial
  readonly grandstandRedBand: THREE.MeshLambertMaterial
  readonly grandstandRoof: THREE.MeshLambertMaterial
  readonly fencePosts: THREE.MeshLambertMaterial
  readonly fenceRailing: THREE.MeshLambertMaterial
  readonly tireBlack: THREE.MeshLambertMaterial
  readonly tireWhite: THREE.MeshLambertMaterial
  readonly tireBelt: THREE.MeshLambertMaterial
  readonly billboardFrame: THREE.MeshLambertMaterial
  readonly billboardPosts: THREE.MeshLambertMaterial
  readonly billboardField: THREE.MeshLambertMaterial

  private allMaterials: THREE.Material[] = []

  constructor() {
    this.grass = this.createLambert(LANDSCAPE_COLORS.grass)
    this.grassVertex = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
    this.allMaterials.push(this.grassVertex)

    this.hills = this.createLambert(LANDSCAPE_COLORS.hills, true)
    this.hillsDark = this.createLambert(LANDSCAPE_COLORS.hillsDark, true)
    this.canopyPoplar = this.createLambert(LANDSCAPE_COLORS.canopy, true)
    this.canopyOak = this.createLambert(LANDSCAPE_COLORS.canopyOak, true)
    this.trunk = this.createLambert(LANDSCAPE_COLORS.trunk, true)
    this.rockGrey = this.createLambert(LANDSCAPE_COLORS.rockGrey, true)
    this.gantryArch = this.createLambert(LANDSCAPE_COLORS.gantryArch, true)
    this.gantryPillars = this.createLambert(LANDSCAPE_COLORS.gantryPillars, true)
    this.runoffAsphalt = this.createLambert(LANDSCAPE_COLORS.runoffAsphalt)
    this.gravel = this.createLambert(LANDSCAPE_COLORS.gravel)
    this.grandstandBody = this.createLambert(LANDSCAPE_COLORS.grandstand)
    this.grandstandBlue = this.createLambert(LANDSCAPE_COLORS.grandstandBlue)
    this.grandstandRedBand = this.createLambert(LANDSCAPE_COLORS.grandstandRedBand)
    this.grandstandRoof = this.createLambert(LANDSCAPE_COLORS.grandstandRoof, true)
    this.fencePosts = this.createLambert(LANDSCAPE_COLORS.fencePosts)
    this.fenceRailing = this.createLambert(LANDSCAPE_COLORS.fenceRailing)
    this.tireBlack = this.createLambert(LANDSCAPE_COLORS.tires)
    this.tireWhite = this.createLambert(LANDSCAPE_COLORS.tiresWhite)
    this.tireBelt = this.createLambert(LANDSCAPE_COLORS.tireBelt)
    this.billboardFrame = this.createLambert(LANDSCAPE_COLORS.billboardFrame)
    this.billboardPosts = this.createLambert(LANDSCAPE_COLORS.billboardPosts)
    this.billboardField = this.createLambert(LANDSCAPE_COLORS.billboardField)
  }

  private createLambert(color: number, flatShading = false): THREE.MeshLambertMaterial {
    const mat = new THREE.MeshLambertMaterial({ color, flatShading })
    this.allMaterials.push(mat)
    return mat
  }

  dispose(): void {
    for (const mat of this.allMaterials) {
      mat.dispose()
    }
  }
}
