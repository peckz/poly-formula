import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  createLandscape,
  LANDSCAPE_COLORS,
  LandscapeMaterials,
  SPONSOR_BRANDS,
  SponsorTextureManager,
  createPoplarGeometry,
  createOakGeometry,
  createTreeManager,
  createGrandstandMesh,
  createBillboardMesh,
  createTireStackManager,
  createTerrain,
  MONZA_SNAP_TARGETS,
  MONZA_SCENERY_PLACEMENTS,
} from './index.ts'

test('Visual palette contains all required PS1 park circuit colors', () => {
  assert.equal(LANDSCAPE_COLORS.sky, 0x8ec4e0, 'Sky color should be #8EC4E0')
  assert.equal(LANDSCAPE_COLORS.fog, 0xb4c4b8, 'Fog color should be #B4C4B8')
  assert.equal(LANDSCAPE_COLORS.grass, 0x4f7a3e, 'Grass color should be #4F7A3E')
  assert.equal(LANDSCAPE_COLORS.canopy, 0x2d4a28, 'Canopy color should be #2D4A28')
  assert.equal(LANDSCAPE_COLORS.trunk, 0x5c4033, 'Trunk color should be #5C4033')
  assert.equal(LANDSCAPE_COLORS.runoffAsphalt, 0x3d3d42, 'Runoff color should be #3D3D42')
  assert.equal(LANDSCAPE_COLORS.gravel, 0xc2b08a, 'Gravel color should be #C2B08A')
  assert.equal(LANDSCAPE_COLORS.grandstand, 0xe6e2d8, 'Grandstand body should be #E6E2D8')
  assert.equal(LANDSCAPE_COLORS.grandstandRedBand, 0xb81c2c, 'Italian red band should be #B81C2C')
  assert.equal(LANDSCAPE_COLORS.tires, 0x1c1c1c, 'Tires color should be #1C1C1C')
  assert.equal(LANDSCAPE_COLORS.billboardField, 0xf2efe8, 'Billboard field should be #F2EFE8')
  assert.equal(LANDSCAPE_COLORS.billboardFrame, 0xd8d4cc, 'Billboard frame should be #D8D4CC')
})

test('All 10 sponsor brands are supported and generate valid textures', () => {
  const expectedBrands = [
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
  ]
  assert.equal(SPONSOR_BRANDS.length, 10)
  for (const b of expectedBrands) {
    assert.ok(SPONSOR_BRANDS.includes(b as (typeof SPONSOR_BRANDS)[number]))
  }

  const manager = new SponsorTextureManager()
  for (const brand of SPONSOR_BRANDS) {
    const tex = manager.getTexture(brand)
    assert.ok(tex instanceof THREE.Texture, `Texture for ${brand} should be a Three.js texture`)
  }
  manager.dispose()
})

test('Tree models generate valid 3D geometries for Poplar (Type A) and Oak (Type B)', () => {
  const poplar = createPoplarGeometry()
  assert.ok(poplar.trunk.getAttribute('position').count > 0)
  assert.ok(poplar.canopy.getAttribute('position').count > 0)
  poplar.trunk.dispose()
  poplar.canopy.dispose()

  const oak = createOakGeometry()
  assert.ok(oak.trunk.getAttribute('position').count > 0)
  assert.ok(oak.canopy.getAttribute('position').count > 0)
  oak.trunk.dispose()
  oak.canopy.dispose()
})

test('Grandstand block contains stepped tiers, Italian red band, and roof structure', () => {
  const materials = new LandscapeMaterials()
  const grandstand = createGrandstandMesh(materials, {
    id: 'test-grandstand',
    length: 40,
    depth: 14,
    height: 10,
    stepCount: 6,
    position: [10, 0, -20],
    rotationY: Math.PI / 4,
  })

  assert.equal(grandstand.name, 'test-grandstand')
  assert.equal(grandstand.position.x, 10)
  assert.equal(grandstand.position.z, -20)
  assert.ok(grandstand.children.length >= 8, 'Grandstand should have tiers, red bands, walls, and roof')

  // Check red band presence
  const redBands = grandstand.children.filter(
    (c) => c instanceof THREE.Mesh && c.material === materials.grandstandRedBand,
  )
  assert.ok(redBands.length >= 1, 'Should contain Italian red accent band')

  materials.dispose()
})

test('Billboard mesh creates posts, frame, and sponsor face', () => {
  const materials = new LandscapeMaterials()
  const texManager = new SponsorTextureManager()

  const billboard = createBillboardMesh(materials, texManager, {
    id: 'test-billboard',
    brand: 'Grok Bot',
    width: 12,
    height: 3,
    position: [5, 0, 15],
  })

  assert.equal(billboard.name, 'test-billboard')
  assert.equal(billboard.position.x, 5)
  assert.equal(billboard.position.z, 15)
  assert.ok(billboard.children.length >= 4, 'Billboard should contain posts, frame, and face quads')

  materials.dispose()
  texManager.dispose()
})

test('Tree and tire managers support instanced batching', () => {
  const materials = new LandscapeMaterials()

  const treeMgr = createTreeManager(materials, [
    { type: 'poplar', position: [10, 0, 10] },
    { type: 'oak', position: [20, 0, 20] },
  ])
  assert.ok(treeMgr.group.children.length > 0)
  treeMgr.dispose()

  const tireMgr = createTireStackManager(materials, [
    { position: [0, 0, -50], rows: 2, height: 3, length: 8 },
  ])
  assert.ok(tireMgr.group.children.length > 0)
  tireMgr.dispose()

  materials.dispose()
})

test('Monza snap targets (S/F, Rettifilo, Parabolica) are defined with landmarks', () => {
  const sf = MONZA_SNAP_TARGETS.find((s) => s.name === 'SF')
  const rettifilo = MONZA_SNAP_TARGETS.find((s) => s.name === 'Rettifilo')
  const parabolica = MONZA_SNAP_TARGETS.find((s) => s.name === 'Parabolica')

  assert.ok(sf, 'S/F snap target must exist')
  assert.ok(rettifilo, 'Rettifilo snap target must exist')
  assert.ok(parabolica, 'Parabolica snap target must exist')

  assert.equal(sf?.position[0], 0)
  assert.equal(sf?.position[1], 0)
  assert.equal(sf?.position[2], 0)

  assert.ok(rettifilo && rettifilo.position[2] < -500, 'Rettifilo should be down the straight')
  assert.ok(parabolica && parabolica.position[2] > 300, 'Parabolica should be in the southern sector')
})

test('createTerrain builds ground plane and runoff/gravel meshes', () => {
  const materials = new LandscapeMaterials()
  const terrain = createTerrain(materials, [
    { type: 'asphalt', position: [0, 0, -600], width: 30, length: 100 },
    { type: 'gravel', position: [0, 0, -700], width: 25, length: 50 },
  ])

  assert.ok(terrain.group.children.length >= 3, 'Terrain group should contain grass, runway, kerbs, and runoff')
  terrain.dispose()
  materials.dispose()
})

test('MONZA_SCENERY_PLACEMENTS includes grandstands, billboards, and snap markers', () => {
  assert.ok(MONZA_SCENERY_PLACEMENTS.length >= 10)
  const grandstands = MONZA_SCENERY_PLACEMENTS.filter((p) => p.type === 'grandstand')
  const billboards = MONZA_SCENERY_PLACEMENTS.filter((p) => p.type === 'billboard')

  assert.ok(grandstands.length >= 3, 'Should include at least 3 grandstand blocks (S/F, Rettifilo, Parabolica)')
  assert.ok(billboards.length >= 8, 'Should include sponsor billboards')

  for (const b of billboards) {
    assert.ok(b.brand, 'Billboard placement must specify sponsor brand')
  }
})

test('createLandscape initializes scene, mounts objects, and allows snap target rebinding', () => {
  const scene = new THREE.Scene()
  const landscape = createLandscape(scene, {
    enableLighting: true,
    enableFog: true,
    enableGround: true,
  })

  assert.ok(scene.children.includes(landscape.group), 'Landscape group must be added to scene')
  assert.ok(landscape.snapTargets.length >= 3, 'Should provide snap targets')

  const rettifilo = landscape.getSnapTarget('Rettifilo')
  assert.ok(rettifilo)

  // Test snap rebinding
  landscape.rebindSnapTarget('Rettifilo', [5, 0, -680], 0.2)
  const updated = landscape.getSnapTarget('Rettifilo')
  assert.equal(updated?.position[0], 5)
  assert.equal(updated?.position[2], -680)
  assert.equal(updated?.rotationY, 0.2)

  // Test disposal
  landscape.dispose()
  assert.ok(!scene.children.includes(landscape.group), 'Landscape group should be removed on dispose')
})
