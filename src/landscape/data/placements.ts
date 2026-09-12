import type { SceneryPlacement, SnapTarget } from '../types.ts'

/**
 * Named landmark snap targets along the Monza circuit.
 * Track engineers can bind to these markers when the ribbon JSON is ready.
 */
export const MONZA_SNAP_TARGETS: SnapTarget[] = [
  {
    name: 'SF',
    label: 'Start / Finish Straight (Rettifilo Tribune)',
    description: 'Main straight spectator zone, pit-facing grandstands, and high-speed sponsor rows.',
    position: [0, 0, 0],
    rotationY: 0,
    associatedItemIds: [
      'gs-sf-main-1',
      'gs-sf-main-2',
      'bb-sf-grok',
      'bb-sf-firecrawl',
      'bb-sf-exa',
      'bb-sf-daytona',
      'bb-sf-render',
    ],
  },
  {
    name: 'Rettifilo',
    label: 'Variante del Rettifilo (Prima Variante)',
    description: '350 km/h heavy braking zone into tight right-left chicane with tire barriers and gravel runoff.',
    position: [0, 0, -650],
    rotationY: 0,
    associatedItemIds: [
      'gs-rettifilo',
      'tire-rettifilo-entry',
      'tire-rettifilo-apex1',
      'tire-rettifilo-apex2',
      'tire-rettifilo-runoff',
      'bb-rettifilo-fal',
      'bb-rettifilo-xai',
      'bb-rettifilo-convex',
    ],
  },
  {
    name: 'CurvaGrande',
    label: 'Curva Grande (Biassono)',
    description: 'Long sweeping flat-out right hand curve lined with Royal Park poplar and oak groves.',
    position: [60, 0, -1100],
    rotationY: Math.PI / 6,
    associatedItemIds: ['bb-curvagrande-wonder', 'bb-curvagrande-wispr'],
  },
  {
    name: 'Lesmo',
    label: 'Curva di Lesmo (Lesmo 1 & 2)',
    description: 'Technical mid-speed corners cutting through dense park woods.',
    position: [120, 0, -1600],
    rotationY: Math.PI / 3,
    associatedItemIds: ['bb-lesmo-render', 'bb-lesmo-grok'],
  },
  {
    name: 'Ascari',
    label: 'Variante Ascari',
    description: 'High-speed sequence with aggressive kerbs, deceleration tire stacks, and spectator banks.',
    position: [-80, 0, -350],
    rotationY: -Math.PI / 4,
    associatedItemIds: ['tire-ascari-apex', 'bb-ascari-daytona', 'bb-ascari-firecrawl'],
  },
  {
    name: 'Parabolica',
    label: 'Curva Parabolica (Curva Alboreto)',
    description: 'Iconic increasing-radius long right sweeper leading back onto the main straight.',
    position: [30, 0, 500],
    rotationY: Math.PI * 0.75,
    associatedItemIds: [
      'gs-parabolica',
      'tire-parabolica-outer',
      'bb-parabolica-exa',
      'bb-parabolica-fal',
      'bb-parabolica-wonder',
    ],
  },
]

/**
 * Provisional scenery layout for Monza Park circuit scaffold.
 * Positioned intentionally around the current scene coordinates until the track ribbon is bound.
 */
export const MONZA_SCENERY_PLACEMENTS: SceneryPlacement[] = [
  // ==========================================
  // 1. START / FINISH STRAIGHT (z: -300 to +300)
  // ==========================================

  // Grandstand Block 1: Main Straight North
  {
    id: 'gs-sf-main-1',
    type: 'grandstand',
    position: [26, 0, -45],
    rotationY: -Math.PI / 2, // Facing West toward track
    snapMarker: 'SF',
    properties: { length: 44, height: 10 },
  },

  // Grandstand Block 2: Main Straight South
  {
    id: 'gs-sf-main-2',
    type: 'grandstand',
    position: [26, 0, 45],
    rotationY: -Math.PI / 2, // Facing West toward track
    snapMarker: 'SF',
    properties: { length: 44, height: 10 },
  },

  // S/F Sponsor Billboards (~80-120m spacing along spectator side)
  {
    id: 'bb-sf-grok',
    type: 'billboard',
    brand: 'Grok Bot',
    position: [-16, 0, -220],
    rotationY: 0.1,
    snapMarker: 'SF',
  },
  {
    id: 'bb-sf-firecrawl',
    type: 'billboard',
    brand: 'Firecrawl',
    position: [-16, 0, -120],
    rotationY: 0.05,
    snapMarker: 'SF',
  },
  {
    id: 'bb-sf-exa',
    type: 'billboard',
    brand: 'Exa',
    position: [-16, 0, -20],
    rotationY: 0,
    snapMarker: 'SF',
  },
  {
    id: 'bb-sf-daytona',
    type: 'billboard',
    brand: 'Daytona',
    position: [-16, 0, 80],
    rotationY: -0.05,
    snapMarker: 'SF',
  },
  {
    id: 'bb-sf-render',
    type: 'billboard',
    brand: 'Render',
    position: [-16, 0, 180],
    rotationY: -0.1,
    snapMarker: 'SF',
  },

  // ==========================================
  // 2. VARIANTE DEL RETTIFILO (z: -550 to -750)
  // ==========================================

  // Rettifilo Chicane Grandstand Block
  {
    id: 'gs-rettifilo',
    type: 'grandstand',
    position: [28, 0, -660],
    rotationY: -Math.PI * 0.6,
    snapMarker: 'Rettifilo',
    properties: { length: 40, height: 9.5 },
  },

  // Rettifilo Braking Boards & Sponsor Billboards
  {
    id: 'bb-rettifilo-fal',
    type: 'billboard',
    brand: 'Fal.ai',
    position: [-18, 0, -520],
    rotationY: 0.15,
    snapMarker: 'Rettifilo',
  },
  {
    id: 'bb-rettifilo-xai',
    type: 'billboard',
    brand: 'x.ai',
    position: [20, 0, -580],
    rotationY: -0.2,
    snapMarker: 'Rettifilo',
  },
  {
    id: 'bb-rettifilo-convex',
    type: 'billboard',
    brand: 'Convex',
    position: [-22, 0, -710],
    rotationY: 0.25,
    snapMarker: 'Rettifilo',
  },

  // ==========================================
  // 3. CURVA PARABOLICA (z: +350 to +750)
  // ==========================================

  // Parabolica Grandstand Block
  {
    id: 'gs-parabolica',
    type: 'grandstand',
    position: [34, 0, 520],
    rotationY: -Math.PI * 0.75,
    snapMarker: 'Parabolica',
    properties: { length: 48, height: 10.5 },
  },

  // Parabolica Sponsor Billboards
  {
    id: 'bb-parabolica-wonder',
    type: 'billboard',
    brand: 'Wonder',
    position: [-20, 0, 360],
    rotationY: -0.15,
    snapMarker: 'Parabolica',
  },
  {
    id: 'bb-parabolica-wispr',
    type: 'billboard',
    brand: 'Wispr Flow',
    position: [24, 0, 440],
    rotationY: -0.3,
    snapMarker: 'Parabolica',
  },
  {
    id: 'bb-parabolica-exa',
    type: 'billboard',
    brand: 'Exa',
    position: [38, 0, 620],
    rotationY: -0.5,
    snapMarker: 'Parabolica',
  },
  {
    id: 'bb-parabolica-fal',
    type: 'billboard',
    brand: 'Fal.ai',
    position: [20, 0, 720],
    rotationY: -0.7,
    snapMarker: 'Parabolica',
  },

  // Distant trackside sponsors (Curva Grande & Lesmo preview)
  {
    id: 'bb-curvagrande-wonder',
    type: 'billboard',
    brand: 'Wonder',
    position: [-24, 0, -950],
    rotationY: 0.1,
    snapMarker: 'CurvaGrande',
  },
  {
    id: 'bb-curvagrande-wispr',
    type: 'billboard',
    brand: 'Wispr Flow',
    position: [28, 0, -1150],
    rotationY: -0.15,
    snapMarker: 'CurvaGrande',
  },
  {
    id: 'bb-lesmo-render',
    type: 'billboard',
    brand: 'Render',
    position: [-25, 0, -1450],
    rotationY: 0.2,
    snapMarker: 'Lesmo',
  },
  {
    id: 'bb-lesmo-grok',
    type: 'billboard',
    brand: 'Grok Bot',
    position: [30, 0, -1700],
    rotationY: -0.2,
    snapMarker: 'Lesmo',
  },
]

/**
 * Procedural grove generator for Monza Royal Park trees.
 * Populates authentic Italian poplars and stone oaks outside apron & gravel bands.
 */
export function generateParkTreePlacements(): SceneryPlacement[] {
  const treePlacements: SceneryPlacement[] = []
  let idCount = 1

  // 1. Poplar Avenue behind Main Grandstands (East side: x: 38 to 65, z: -400 to +400)
  for (let z = -400; z <= 400; z += 24) {
    const jitterX = (Math.sin(z * 0.1) * 3)
    const jitterZ = (Math.cos(z * 0.2) * 2)
    treePlacements.push({
      id: `tree-poplar-avenue-${idCount++}`,
      type: 'tree',
      subtype: 'poplar',
      position: [42 + jitterX, 0, z + jitterZ],
      rotationY: Math.sin(z) * 0.5,
      scale: 0.9 + Math.abs(Math.sin(z * 0.3)) * 0.25,
      snapMarker: 'SF',
    })

    // Second deeper row
    if (z % 48 === 0) {
      treePlacements.push({
        id: `tree-poplar-avenue-deep-${idCount++}`,
        type: 'tree',
        subtype: 'poplar',
        position: [56 + jitterX, 0, z + 12 + jitterZ],
        rotationY: Math.cos(z) * 0.5,
        scale: 0.95 + Math.abs(Math.cos(z * 0.3)) * 0.2,
        snapMarker: 'SF',
      })
    }
  }

  // 2. West parkland tree groves (x: -45 to -90, along main straight)
  for (let z = -500; z <= 500; z += 35) {
    const isOak = (z / 35) % 2 === 0
    const xBase = isOak ? -48 : -62
    const jitterX = Math.sin(z * 0.4) * 4
    const jitterZ = Math.cos(z * 0.5) * 5

    treePlacements.push({
      id: `tree-west-park-${idCount++}`,
      type: 'tree',
      subtype: isOak ? 'oak' : 'poplar',
      position: [xBase + jitterX, 0, z + jitterZ],
      rotationY: (z * 0.3) % Math.PI,
      scale: 0.85 + Math.abs(Math.sin(z)) * 0.3,
      snapMarker: 'SF',
    })
  }

  // 3. Dense Rettifilo Chicane Park Woods (z: -580 to -850)
  for (let z = -580; z >= -850; z -= 30) {
    // East woods
    treePlacements.push({
      id: `tree-rettifilo-east-${idCount++}`,
      type: 'tree',
      subtype: idCount % 3 === 0 ? 'oak' : 'poplar',
      position: [46 + (Math.sin(z) * 6), 0, z + (Math.cos(z) * 4)],
      rotationY: (z * 0.5) % Math.PI,
      scale: 0.9 + (idCount % 5) * 0.06,
      snapMarker: 'Rettifilo',
    })

    // West woods
    treePlacements.push({
      id: `tree-rettifilo-west-${idCount++}`,
      type: 'tree',
      subtype: idCount % 2 === 0 ? 'oak' : 'poplar',
      position: [-42 - (Math.cos(z) * 8), 0, z + (Math.sin(z) * 4)],
      rotationY: (z * 0.7) % Math.PI,
      scale: 0.9 + (idCount % 4) * 0.08,
      snapMarker: 'Rettifilo',
    })
  }

  // 4. Parabolica Woods (z: +450 to +900)
  for (let z = 450; z <= 900; z += 32) {
    treePlacements.push({
      id: `tree-parabolica-grove-${idCount++}`,
      type: 'tree',
      subtype: idCount % 2 === 0 ? 'oak' : 'poplar',
      position: [54 + Math.sin(z * 0.2) * 8, 0, z + Math.cos(z * 0.2) * 5],
      rotationY: (z * 0.4) % Math.PI,
      scale: 0.92 + (idCount % 3) * 0.1,
      snapMarker: 'Parabolica',
    })

    treePlacements.push({
      id: `tree-parabolica-outer-${idCount++}`,
      type: 'tree',
      subtype: 'oak',
      position: [-50 + Math.cos(z * 0.2) * 10, 0, z + Math.sin(z * 0.2) * 6],
      rotationY: (z * 0.6) % Math.PI,
      scale: 1.0 + (idCount % 4) * 0.05,
      snapMarker: 'Parabolica',
    })
  }

  // 5. Extended Northern Park groves towards Lesmo (z: -900 to -1900)
  for (let z = -900; z >= -1900; z -= 50) {
    treePlacements.push({
      id: `tree-north-park-e-${idCount++}`,
      type: 'tree',
      subtype: idCount % 2 === 0 ? 'poplar' : 'oak',
      position: [40 + (Math.sin(z * 0.05) * 12), 0, z],
      rotationY: z % Math.PI,
      scale: 1.0,
      snapMarker: 'Lesmo',
    })
    treePlacements.push({
      id: `tree-north-park-w-${idCount++}`,
      type: 'tree',
      subtype: idCount % 3 === 0 ? 'poplar' : 'oak',
      position: [-45 - (Math.cos(z * 0.05) * 12), 0, z],
      rotationY: z % Math.PI,
      scale: 1.05,
      snapMarker: 'CurvaGrande',
    })
  }

  return treePlacements
}

/**
 * Designated tire stack placements (at chicane braking and deceleration zones).
 */
export const MONZA_TIRE_STACK_PLACEMENTS = [
  // Rettifilo Chicane Entry Deceleration Zone (Left Runoff)
  {
    position: [-13, 0, -615] as [number, number, number],
    rotationY: 0.1,
    rows: 2,
    height: 3,
    length: 12,
  },
  // Rettifilo Chicane T1 Apex Barrier (Right)
  {
    position: [11, 0, -645] as [number, number, number],
    rotationY: -0.2,
    rows: 3,
    height: 3,
    length: 10,
  },
  // Rettifilo Chicane T2 Apex Barrier (Left)
  {
    position: [-11, 0, -675] as [number, number, number],
    rotationY: 0.25,
    rows: 3,
    height: 3,
    length: 10,
  },
  // Rettifilo Chicane Exit Escape Wall
  {
    position: [0, 0, -730] as [number, number, number],
    rotationY: Math.PI / 2,
    rows: 3,
    height: 3,
    length: 16,
  },
  // Parabolica Approach Outer Wall
  {
    position: [24, 0, 480] as [number, number, number],
    rotationY: -0.35,
    rows: 2,
    height: 3,
    length: 14,
  },
  // Parabolica Mid-Corner Outer Wall
  {
    position: [32, 0, 640] as [number, number, number],
    rotationY: -0.65,
    rows: 3,
    height: 3,
    length: 16,
  },
]

/**
 * Runoff visual patches (asphalt aprons & gravel trap beds).
 */
export const MONZA_RUNOFF_AREAS = [
  // Rettifilo Chicane Asphalt Runoff Apron
  {
    id: 'runoff-rettifilo-asphalt',
    type: 'asphalt' as const,
    position: [0, 0, -660] as [number, number, number],
    width: 32,
    length: 120,
    rotationY: 0,
  },
  // Rettifilo Chicane Gravel Trap Escape Bed
  {
    id: 'gravel-rettifilo-escape',
    type: 'gravel' as const,
    position: [0, 0, -745] as [number, number, number],
    width: 28,
    length: 45,
    rotationY: 0,
  },
  // Parabolica Outer Gravel Trap
  {
    id: 'gravel-parabolica-outer',
    type: 'gravel' as const,
    position: [28, 0, 560] as [number, number, number],
    width: 26,
    length: 160,
    rotationY: -0.4,
  },
]
