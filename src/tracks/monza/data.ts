import * as THREE from 'three'
import type {
  CornerMarker,
  TrackData,
  TrackPoint,
  TrackSample,
  TrackSegmentSpec,
} from './types'

/**
 * Modern Monza GP Circuit (Autodromo Nazionale Monza)
 * Total target length: 5,793 metres, 11 corners, clockwise.
 *
 * Coordinates are in metres (1 unit = 1 metre):
 * - X: East (+X) / West (-X)
 * - Y: Elevation (0 for flat ribbon preview)
 * - Z: South (+Z) / North (-Z)
 *
 * Clockwise progression:
 * Start/Finish Line (0, 0) -> North -> Variante del Rettifilo (T1-T2) ->
 * Curva Biassono (T3) -> Variante della Roggia (T4-T5) ->
 * Lesmo 1 (T6) & Lesmo 2 (T7) -> Curva del Serraglio ->
 * Variante Ascari (T8-T10) -> Rettifilo Centrale (Back Straight) ->
 * Curva Parabolica / Alboreto (T11) -> Start/Finish Line
 */

interface RawControlPoint {
  name: string
  corner: number | null
  description?: string
  x: number
  z: number
  halfWidth?: number
  kerbLeft?: number
  kerbRight?: number
}

// Control points accurately modeling the iconic Monza circuit
const RAW_CONTROL_POINTS: RawControlPoint[] = [
  // 1. Pit Straight & Start/Finish
  { name: 'Start/Finish Line', corner: null, x: 0, z: 0 },
  { name: 'Pit Straight Mid', corner: null, x: 0, z: -400 },
  { name: 'Rettifilo 200m Board', corner: null, x: 0, z: -800 },
  { name: 'Rettifilo Braking Zone', corner: null, x: 0, z: -1050 },

  // 2. Variante del Rettifilo (Turns 1-2): Chicane right then left
  {
    name: 'Variante del Rettifilo Entry',
    corner: null,
    x: 5,
    z: -1120,
    halfWidth: 5.2,
    kerbRight: 0.8,
  },
  {
    name: 'Variante del Rettifilo (T1 Right)',
    corner: 1,
    description: 'Sharp 90-degree right flick into chicane',
    x: 30,
    z: -1160,
    halfWidth: 5.0,
    kerbRight: 1.0,
    kerbLeft: 0.5,
  },
  {
    name: 'Variante del Rettifilo (T2 Left)',
    corner: 2,
    description: 'Sharp left flick exiting chicane',
    x: 18,
    z: -1210,
    halfWidth: 5.0,
    kerbLeft: 1.0,
    kerbRight: 0.8,
  },
  {
    name: 'Rettifilo Exit',
    corner: null,
    x: 25,
    z: -1260,
    halfWidth: 5.5,
    kerbLeft: 0.8,
  },

  // 3. Curva Grande / Curva Biassono (Turn 3): Long sweeping right
  { name: 'Curva Grande Entry', corner: null, x: 50, z: -1340 },
  {
    name: 'Curva Biassono (T3)',
    corner: 3,
    description: 'Fast sweeping right hand curve through parkland',
    x: 120,
    z: -1430,
    kerbRight: 0.7,
  },
  { name: 'Curva Biassono Apex', corner: null, x: 230, z: -1490, kerbRight: 0.8 },
  { name: 'Curva Biassono Sweeper', corner: null, x: 370, z: -1495 },
  { name: 'Curva Biassono Exit Sweeper', corner: null, x: 500, z: -1435, kerbLeft: 0.7 },
  { name: 'Curva Biassono Exit', corner: null, x: 600, z: -1320, kerbLeft: 0.8 },

  // 4. Straight towards Variante della Roggia (running SSE)
  { name: 'Straight to Roggia 1', corner: null, x: 680, z: -1190 },
  { name: 'Straight to Roggia 2', corner: null, x: 750, z: -1040 },
  { name: 'Roggia Braking Zone', corner: null, x: 810, z: -900 },

  // 5. Variante della Roggia (Turns 4-5): Chicane left then right
  {
    name: 'Variante della Roggia (T4 Left)',
    corner: 4,
    description: 'Heavy braking into chicane left flick',
    x: 800,
    z: -830,
    halfWidth: 5.0,
    kerbLeft: 1.0,
    kerbRight: 0.4,
  },
  {
    name: 'Variante della Roggia (T5 Right)',
    corner: 5,
    description: 'Chicane right exit flick',
    x: 830,
    z: -770,
    halfWidth: 5.0,
    kerbRight: 1.0,
    kerbLeft: 0.9,
  },
  { name: 'Roggia Exit', corner: null, x: 865, z: -720, halfWidth: 5.5, kerbLeft: 0.9 },

  // 6. Straight to Lesmo 1
  { name: 'Straight to Lesmo 1', corner: null, x: 915, z: -630 },

  // 7. Curva di Lesmo 1 (Turn 6): 90-degree right
  {
    name: 'Curva di Lesmo 1 (T6)',
    corner: 6,
    description: 'Medium-speed right turn',
    x: 980,
    z: -550,
    halfWidth: 5.4,
    kerbRight: 0.8,
  },
  { name: 'Lesmo 1 Exit', corner: null, x: 1050, z: -530, halfWidth: 5.5, kerbLeft: 0.8 },

  // 8. Short link to Lesmo 2
  { name: 'Between Lesmos', corner: null, x: 1115, z: -550 },

  // 9. Curva di Lesmo 2 (Turn 7): 90-degree downhill right
  {
    name: 'Curva di Lesmo 2 (T7)',
    corner: 7,
    description: 'Second Lesmo right turn heading downhill towards Serraglio',
    x: 1175,
    z: -610,
    halfWidth: 5.4,
    kerbRight: 0.9,
  },
  { name: 'Lesmo 2 Exit', corner: null, x: 1180, z: -690, halfWidth: 5.5, kerbLeft: 0.9 },

  // 10. Curva del Serraglio & Straight down to Ascari
  { name: 'Curva del Serraglio', corner: null, x: 1165, z: -800 },
  { name: 'Old Banking Overpass', corner: null, x: 1130, z: -980 },
  { name: 'Serraglio Straight', corner: null, x: 1080, z: -1180 },
  { name: 'Ascari Braking Zone', corner: null, x: 1020, z: -1360 },

  // 11. Variante Ascari (Turns 8-10): Left-Right-Left high-speed chicane
  {
    name: 'Variante Ascari (T8 Left)',
    corner: 8,
    description: 'Fast left entry into Ascari complex',
    x: 975,
    z: -1450,
    halfWidth: 5.2,
    kerbLeft: 0.9,
  },
  {
    name: 'Variante Ascari (T9 Right)',
    corner: 9,
    description: 'Ascari mid-corner transition right',
    x: 885,
    z: -1495,
    halfWidth: 5.2,
    kerbRight: 0.9,
  },
  {
    name: 'Variante Ascari (T10 Left)',
    corner: 10,
    description: 'Fast left exit leading onto back straight',
    x: 795,
    z: -1470,
    halfWidth: 5.5,
    kerbLeft: 0.9,
    kerbRight: 0.8,
  },
  { name: 'Ascari Exit Straight', corner: null, x: 710, z: -1400, kerbRight: 0.7 },

  // 12. Rettifilo Centrale (Back straight running South-West towards Parabolica)
  { name: 'Back Straight 1', corner: null, x: 590, z: -1270 },
  { name: 'Back Straight 2', corner: null, x: 460, z: -1110 },
  { name: 'Back Straight 3', corner: null, x: 330, z: -930 },
  { name: 'Back Straight 4', corner: null, x: 200, z: -730 },
  { name: 'Back Straight 5', corner: null, x: 70, z: -500 },
  { name: 'Parabolica Braking Zone', corner: null, x: -60, z: -250 },

  // 13. Curva Parabolica / Curva Alboreto (Turn 11): ~180-degree right turn
  {
    name: 'Curva Parabolica (T11 Entry)',
    corner: 11,
    description: 'Entry to iconic 180-degree right hander (Curva Alboreto)',
    x: -140,
    z: -70,
    halfWidth: 5.8,
    kerbRight: 0.8,
  },
  {
    name: 'Curva Parabolica Mid',
    corner: null,
    x: -190,
    z: 70,
    halfWidth: 6.0,
    kerbRight: 0.8,
  },
  {
    name: 'Curva Parabolica Apex',
    corner: null,
    x: -160,
    z: 190,
    halfWidth: 6.0,
    kerbRight: 0.9,
  },
  {
    name: 'Curva Parabolica Exit',
    corner: null,
    x: -80,
    z: 240,
    halfWidth: 6.0,
    kerbLeft: 0.9,
  },
  { name: 'Main Straight South Approach', corner: null, x: -20, z: 220, kerbLeft: 0.8 },
  { name: 'Pit Straight South', corner: null, x: 0, z: 150 },
]

// Track segment rules for surface widths and apron types around the circuit
const SEGMENT_SPECS: TrackSegmentSpec[] = [
  // 0 - 1050m: Main straight
  {
    startDistance: 0,
    endDistance: 1050,
    halfWidth: 6.0,
    kerbWidthLeft: 0.0,
    kerbWidthRight: 0.0,
    surfaceBeyondLeft: 'grass',
    surfaceBeyondRight: 'asphalt',
    apronWidthLeft: 3.0,
    apronWidthRight: 4.0,
  },
  // 1050 - 1300m: Variante del Rettifilo (T1-T2)
  {
    startDistance: 1050,
    endDistance: 1300,
    halfWidth: 5.2,
    kerbWidthLeft: 0.9,
    kerbWidthRight: 1.0,
    surfaceBeyondLeft: 'asphalt',
    surfaceBeyondRight: 'asphalt',
    apronWidthLeft: 6.0,
    apronWidthRight: 6.0,
  },
  // 1300 - 2000m: Curva Biassono (T3)
  {
    startDistance: 1300,
    endDistance: 2000,
    halfWidth: 5.8,
    kerbWidthLeft: 0.8,
    kerbWidthRight: 0.8,
    surfaceBeyondLeft: 'grass',
    surfaceBeyondRight: 'grass',
    apronWidthLeft: 4.0,
    apronWidthRight: 4.0,
  },
  // 2000 - 2250m: Straight to Roggia
  {
    startDistance: 2000,
    endDistance: 2250,
    halfWidth: 5.8,
    kerbWidthLeft: 0.0,
    kerbWidthRight: 0.0,
    surfaceBeyondLeft: 'grass',
    surfaceBeyondRight: 'grass',
    apronWidthLeft: 3.0,
    apronWidthRight: 3.0,
  },
  // 2250 - 2450m: Variante della Roggia (T4-T5)
  {
    startDistance: 2250,
    endDistance: 2450,
    halfWidth: 5.1,
    kerbWidthLeft: 1.0,
    kerbWidthRight: 1.0,
    surfaceBeyondLeft: 'gravel',
    surfaceBeyondRight: 'gravel',
    apronWidthLeft: 6.0,
    apronWidthRight: 6.0,
  },
  // 2450 - 2550m: Straight to Lesmo 1
  {
    startDistance: 2450,
    endDistance: 2550,
    halfWidth: 5.6,
    kerbWidthLeft: 0.0,
    kerbWidthRight: 0.0,
    surfaceBeyondLeft: 'grass',
    surfaceBeyondRight: 'grass',
    apronWidthLeft: 3.0,
    apronWidthRight: 3.0,
  },
  // 2550 - 2700m: Curva di Lesmo 1 (T6)
  {
    startDistance: 2550,
    endDistance: 2700,
    halfWidth: 5.4,
    kerbWidthLeft: 0.8,
    kerbWidthRight: 0.9,
    surfaceBeyondLeft: 'gravel',
    surfaceBeyondRight: 'grass',
    apronWidthLeft: 5.0,
    apronWidthRight: 3.0,
  },
  // 2700 - 2780m: Between Lesmos
  {
    startDistance: 2700,
    endDistance: 2780,
    halfWidth: 5.5,
    kerbWidthLeft: 0.0,
    kerbWidthRight: 0.0,
    surfaceBeyondLeft: 'grass',
    surfaceBeyondRight: 'grass',
    apronWidthLeft: 3.0,
    apronWidthRight: 3.0,
  },
  // 2780 - 2920m: Curva di Lesmo 2 (T7)
  {
    startDistance: 2780,
    endDistance: 2920,
    halfWidth: 5.4,
    kerbWidthLeft: 0.9,
    kerbWidthRight: 0.9,
    surfaceBeyondLeft: 'gravel',
    surfaceBeyondRight: 'grass',
    apronWidthLeft: 5.0,
    apronWidthRight: 3.0,
  },
  // 2920 - 3500m: Serraglio straight & old banking bridge
  {
    startDistance: 2920,
    endDistance: 3500,
    halfWidth: 5.8,
    kerbWidthLeft: 0.0,
    kerbWidthRight: 0.0,
    surfaceBeyondLeft: 'grass',
    surfaceBeyondRight: 'grass',
    apronWidthLeft: 3.0,
    apronWidthRight: 3.0,
  },
  // 3500 - 3800m: Variante Ascari (T8-T10)
  {
    startDistance: 3500,
    endDistance: 3800,
    halfWidth: 5.2,
    kerbWidthLeft: 0.9,
    kerbWidthRight: 0.9,
    surfaceBeyondLeft: 'asphalt',
    surfaceBeyondRight: 'gravel',
    apronWidthLeft: 6.0,
    apronWidthRight: 6.0,
  },
  // 3800 - 5050m: Rettifilo Centrale (Back Straight)
  {
    startDistance: 3800,
    endDistance: 5050,
    halfWidth: 6.0,
    kerbWidthLeft: 0.0,
    kerbWidthRight: 0.0,
    surfaceBeyondLeft: 'grass',
    surfaceBeyondRight: 'grass',
    apronWidthLeft: 3.0,
    apronWidthRight: 3.0,
  },
  // 5050 - 5650m: Curva Parabolica / Alboreto (T11)
  {
    startDistance: 5050,
    endDistance: 5650,
    halfWidth: 6.0,
    kerbWidthLeft: 0.9,
    kerbWidthRight: 0.9,
    surfaceBeyondLeft: 'asphalt',
    surfaceBeyondRight: 'grass',
    apronWidthLeft: 6.0,
    apronWidthRight: 3.0,
  },
  // 5650 - 5793m: Approach to start/finish
  {
    startDistance: 5650,
    endDistance: 5793,
    halfWidth: 6.0,
    kerbWidthLeft: 0.7,
    kerbWidthRight: 0.0,
    surfaceBeyondLeft: 'grass',
    surfaceBeyondRight: 'asphalt',
    apronWidthLeft: 3.0,
    apronWidthRight: 4.0,
  },
]

function getSegmentSpecForDistance(distance: number): TrackSegmentSpec {
  for (const spec of SEGMENT_SPECS) {
    if (distance >= spec.startDistance && distance <= spec.endDistance) {
      return spec
    }
  }
  return {
    startDistance: 0,
    endDistance: 5793,
    halfWidth: 5.8,
    kerbWidthLeft: 0.6,
    kerbWidthRight: 0.6,
    surfaceBeyondLeft: 'grass',
    surfaceBeyondRight: 'grass',
    apronWidthLeft: 3.0,
    apronWidthRight: 3.0,
  }
}

/**
 * Builds the complete Monza GP track dataset sampled at high resolution (~1200 points).
 */
export function generateMonzaTrackData(): TrackData {
  const TARGET_LENGTH = 5793 // Monza F1 official circuit length in metres

  // 1. Compute raw curve
  const rawVecs = RAW_CONTROL_POINTS.map((p) => new THREE.Vector3(p.x, 0, p.z))
  const rawCurve = new THREE.CatmullRomCurve3(rawVecs, true, 'centripetal')
  const rawLength = rawCurve.getLength()
  const scale = TARGET_LENGTH / rawLength

  // 2. Scale control points to achieve exact 5793 m closed loop length
  const scaledVecs = rawVecs.map((v) => v.clone().multiplyScalar(scale))
  const spline = new THREE.CatmullRomCurve3(scaledVecs, true, 'centripetal')
  const actualLength = spline.getLength()

  const SAMPLE_COUNT = 1200
  const spacedPoints = spline.getSpacedPoints(SAMPLE_COUNT)

  // 3. Find accurate corner markers and lap distances
  const corners: CornerMarker[] = []
  for (let i = 0; i < RAW_CONTROL_POINTS.length; i++) {
    const raw = RAW_CONTROL_POINTS[i]
    if (raw.corner !== null) {
      const targetPos = scaledVecs[i]
      let closestDist = Infinity
      let closestIdx = 0
      for (let j = 0; j <= SAMPLE_COUNT; j++) {
        const d = spacedPoints[j].distanceTo(targetPos)
        if (d < closestDist) {
          closestDist = d
          closestIdx = j
        }
      }
      const distance = (closestIdx / SAMPLE_COUNT) * actualLength
      corners.push({
        number: raw.corner,
        name: raw.name,
        description: raw.description,
        distance: Math.round(distance),
        position: {
          x: targetPos.x,
          y: targetPos.y,
          z: targetPos.z,
        },
      })
    }
  }

  // Sort corners by corner number
  corners.sort((a, b) => a.number - b.number)

  // 4. Generate per-sample ribbon data
  const samples: TrackSample[] = []
  const UP = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = i / SAMPLE_COUNT
    const distance = t * actualLength
    const pos = spline.getPointAt(t)
    const tangent = spline.getTangentAt(t).normalize()

    // Normal vector pointing right relative to track forward direction
    // (Tangent x Up)
    const normal = new THREE.Vector3().crossVectors(tangent, UP).normalize()

    const spec = getSegmentSpecForDistance(distance)

    samples.push({
      index: i,
      distance,
      t,
      position: { x: pos.x, y: pos.y, z: pos.z },
      tangent: { x: tangent.x, y: tangent.y, z: tangent.z },
      normal: { x: normal.x, y: normal.y, z: normal.z },
      halfWidth: spec.halfWidth,
      kerbWidthLeft: spec.kerbWidthLeft,
      kerbWidthRight: spec.kerbWidthRight,
      surfaceBeyondLeft: spec.surfaceBeyondLeft,
      surfaceBeyondRight: spec.surfaceBeyondRight,
      apronWidthLeft: spec.apronWidthLeft ?? 3.0,
      apronWidthRight: spec.apronWidthRight ?? 3.0,
    })
  }

  const controlPoints: TrackPoint[] = scaledVecs.map((v) => ({
    x: v.x,
    y: v.y,
    z: v.z,
  }))

  return {
    id: 'monza',
    name: 'Autodromo Nazionale Monza',
    country: 'Italy',
    lengthMeters: Math.round(actualLength * 10) / 10,
    targetLapLengthMeters: TARGET_LENGTH,
    isClosedLoop: true,
    clockwise: true,
    description:
      'Approximation of the modern 5,793 m Monza GP layout with 11 corners (Variante del Rettifilo, Curva Biassono, Variante della Roggia, Lesmo 1 & 2, Variante Ascari, Curva Parabolica / Alboreto).',
    corners,
    controlPoints,
    samples,
  }
}

export const monzaTrack = generateMonzaTrackData()
