import * as THREE from 'three'

/**
 * Monza Park low-poly / PS1 visual palette.
 * Uses Lambert / vertex coloring; no PBR roughness/metalness overhead.
 */
export const LANDSCAPE_COLORS = {
  sky: 0x8ec4e0, // #8EC4E0 - Pale Mediterranean sky
  fog: 0xb4c4b8, // #B4C4B8 - Morning parkland mist
  grass: 0x4f7a3e, // #4F7A3E - Monza Royal Park grass
  grassDark: 0x426934, // Subtle darker grass variation
  grassLight: 0x5a8a47, // Subtle lighter grass highlight
  canopy: 0x2d4a28, // #2D4A28 - Italian cypress & pine canopy
  canopyOak: 0x34542d, // Broadleaf oak canopy
  trunk: 0x5c4033, // #5C4033 - Tree wood trunk
  runoffAsphalt: 0x3d3d42, // #3D3D42 - Runoff asphalt apron
  gravel: 0xc2b08a, // #C2B08A - Gravel trap bed
  grandstand: 0xe6e2d8, // #E6E2D8 - Concrete grandstand structure
  grandstandRedBand: 0xb81c2c, // #B81C2C - Italian racing red accent band
  grandstandRoof: 0x50555c, // Slate grey corrugated roof
  tires: 0x1c1c1c, // #1C1C1C - Rubber tire barrier
  tiresWhite: 0xe0ded8, // Painted white tire barrier stripe
  tireBelt: 0x2f2f33, // Outer belt strapping
  billboardField: 0xf2efe8, // #F2EFE8 - Billboard display canvas
  billboardFrame: 0xd8d4cc, // #D8D4CC - Galvanized perimeter frame
  billboardPosts: 0x4a4d52, // Steel support pylons
  trackAsphalt: 0x242830, // Main circuit asphalt ribbon
  kerbRed: 0xb81c2c, // Monza kerb red
  kerbWhite: 0xf2efe8, // Monza kerb white
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
