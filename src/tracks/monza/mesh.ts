import * as THREE from 'three'
import type { TrackData } from './types'

export interface TrackMeshGroupOptions {
  showApron?: boolean
  showKerbs?: boolean
  showCenterline?: boolean
  showCornerMarkers?: boolean
}

/**
 * Creates a complete Three.js Group containing the Monza track meshes:
 * - Asphalt track ribbon with dark matte surface
 * - High-contrast alternating red/white F1 kerb strips along edges
 * - Runoff / apron bands outside kerbs (asphalt, gravel, grass tint)
 * - Start/Finish checkered line
 * - Optional corner markers / visual aids
 */
export function createMonzaTrackMeshGroup(
  track: TrackData,
  options: TrackMeshGroupOptions = {},
): THREE.Group {
  const {
    showApron = true,
    showKerbs = true,
    showCenterline = false,
    showCornerMarkers = true,
  } = options

  const group = new THREE.Group()
  group.name = 'monza-track'

  const samples = track.samples
  const count = samples.length

  if (count < 3) {
    return group
  }

  // 1. Asphalt Track Ribbon Geometry
  // Each segment has 2 quads (or 1 quad): left edge to right edge
  const asphaltPositions: number[] = []
  const asphaltNormals: number[] = []
  const asphaltUvs: number[] = []
  const asphaltIndices: number[] = []

  for (let i = 0; i < count; i++) {
    const s = samples[i]
    const p = s.position
    const n = s.normal
    const hw = s.halfWidth

    // Left edge (x - n*hw, z - n*hw)
    const lx = p.x - n.x * hw
    const ly = p.y + 0.05
    const lz = p.z - n.z * hw

    // Right edge (x + n*hw, z + n*hw)
    const rx = p.x + n.x * hw
    const ry = p.y + 0.05
    const rz = p.z + n.z * hw

    asphaltPositions.push(lx, ly, lz, rx, ry, rz)
    asphaltNormals.push(0, 1, 0, 0, 1, 0)
    asphaltUvs.push(0, s.t * 100, 1, s.t * 100)
  }

  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count
    const i0 = i * 2
    const i1 = i * 2 + 1
    const i2 = next * 2
    const i3 = next * 2 + 1

    asphaltIndices.push(i0, i1, i2)
    asphaltIndices.push(i1, i3, i2)
  }

  const asphaltGeo = new THREE.BufferGeometry()
  asphaltGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(asphaltPositions, 3),
  )
  asphaltGeo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(asphaltNormals, 3),
  )
  asphaltGeo.setAttribute('uv', new THREE.Float32BufferAttribute(asphaltUvs, 2))
  asphaltGeo.setIndex(asphaltIndices)

  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x242426, // Classic dark asphalt
    roughness: 0.85,
    metalness: 0.1,
    side: THREE.DoubleSide,
  })

  const asphaltMesh = new THREE.Mesh(asphaltGeo, asphaltMat)
  asphaltMesh.name = 'track-asphalt'
  group.add(asphaltMesh)

  // 2. Red / White Kerb Strips along edges
  if (showKerbs) {
    const kerbPositions: number[] = []
    const kerbColors: number[] = []
    const kerbNormals: number[] = []
    const kerbIndices: number[] = []

    const colorRed = new THREE.Color(0xdc143c) // F1 Crimson red
    const colorWhite = new THREE.Color(0xf5f5f5) // Clean white
    const STRIPE_PITCH = 2.0 // metres per red/white stripe block

    let vertexOffset = 0

    const buildKerbRibbon = (isRightSide: boolean) => {
      for (let i = 0; i < count; i++) {
        const s = samples[i]
        const p = s.position
        const n = s.normal
        const hw = s.halfWidth
        const kw = isRightSide ? s.kerbWidthRight : s.kerbWidthLeft

        // Active kerb width (if 0 or very small, collapse to 0)
        const effectiveKw = Math.max(kw, 0.0)

        // Inner edge of kerb (touches track asphalt)
        const inSign = isRightSide ? 1 : -1
        const inX = p.x + inSign * n.x * hw
        const inY = p.y + 0.12 // Kerbs slightly raised
        const inZ = p.z + inSign * n.z * hw

        // Outer edge of kerb
        const outX = p.x + inSign * n.x * (hw + effectiveKw)
        const outY = p.y + 0.1 // Slight camber slope outward
        const outZ = p.z + inSign * n.z * (hw + effectiveKw)

        // Alternating color based on lap distance
        const stripeIndex = Math.floor(s.distance / STRIPE_PITCH)
        const isRed = stripeIndex % 2 === 0
        const chosenColor = effectiveKw > 0.05 ? (isRed ? colorRed : colorWhite) : colorWhite

        kerbPositions.push(inX, inY, inZ, outX, outY, outZ)
        kerbNormals.push(0, 1, 0, 0, 1, 0)
        kerbColors.push(
          chosenColor.r,
          chosenColor.g,
          chosenColor.b,
          chosenColor.r,
          chosenColor.g,
          chosenColor.b,
        )
      }

      for (let i = 0; i < count; i++) {
        const next = (i + 1) % count
        const i0 = vertexOffset + i * 2
        const i1 = vertexOffset + i * 2 + 1
        const i2 = vertexOffset + next * 2
        const i3 = vertexOffset + next * 2 + 1

        if (isRightSide) {
          kerbIndices.push(i0, i1, i2)
          kerbIndices.push(i1, i3, i2)
        } else {
          kerbIndices.push(i0, i2, i1)
          kerbIndices.push(i1, i2, i3)
        }
      }

      vertexOffset += count * 2
    }

    buildKerbRibbon(false) // Left kerb
    buildKerbRibbon(true) // Right kerb

    const kerbGeo = new THREE.BufferGeometry()
    kerbGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(kerbPositions, 3),
    )
    kerbGeo.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(kerbNormals, 3),
    )
    kerbGeo.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(kerbColors, 3),
    )
    kerbGeo.setIndex(kerbIndices)

    const kerbMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })

    const kerbMesh = new THREE.Mesh(kerbGeo, kerbMat)
    kerbMesh.name = 'track-kerbs'
    group.add(kerbMesh)
  }

  // 3. Aprons / Runoff Bands
  if (showApron) {
    const apronPositions: number[] = []
    const apronColors: number[] = []
    const apronNormals: number[] = []
    const apronIndices: number[] = []

    const asphaltRunoffColor = new THREE.Color(0x36383d) // Dark slate asphalt runoff
    const gravelColor = new THREE.Color(0xc29b68) // Monza sand/gravel trap
    const grassColor = new THREE.Color(0x274a26) // Monza park grass

    let apronVertexOffset = 0

    const buildApronRibbon = (isRightSide: boolean) => {
      for (let i = 0; i < count; i++) {
        const s = samples[i]
        const p = s.position
        const n = s.normal
        const hw = s.halfWidth
        const kw = isRightSide ? s.kerbWidthRight : s.kerbWidthLeft
        const aw = isRightSide ? s.apronWidthRight : s.apronWidthLeft
        const surface = isRightSide ? s.surfaceBeyondRight : s.surfaceBeyondLeft

        const sign = isRightSide ? 1 : -1
        const startR = hw + kw
        const endR = startR + aw

        const inX = p.x + sign * n.x * startR
        const inY = p.y + 0.02
        const inZ = p.z + sign * n.z * startR

        const outX = p.x + sign * n.x * endR
        const outY = p.y + 0.01
        const outZ = p.z + sign * n.z * endR

        let c = grassColor
        if (surface === 'asphalt') {
          c = asphaltRunoffColor
        } else if (surface === 'gravel') {
          c = gravelColor
        }

        apronPositions.push(inX, inY, inZ, outX, outY, outZ)
        apronNormals.push(0, 1, 0, 0, 1, 0)
        apronColors.push(c.r, c.g, c.b, c.r, c.g, c.b)
      }

      for (let i = 0; i < count; i++) {
        const next = (i + 1) % count
        const i0 = apronVertexOffset + i * 2
        const i1 = apronVertexOffset + i * 2 + 1
        const i2 = apronVertexOffset + next * 2
        const i3 = apronVertexOffset + next * 2 + 1

        if (isRightSide) {
          apronIndices.push(i0, i1, i2)
          apronIndices.push(i1, i3, i2)
        } else {
          apronIndices.push(i0, i2, i1)
          apronIndices.push(i1, i2, i3)
        }
      }

      apronVertexOffset += count * 2
    }

    buildApronRibbon(false)
    buildApronRibbon(true)

    const apronGeo = new THREE.BufferGeometry()
    apronGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(apronPositions, 3),
    )
    apronGeo.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(apronNormals, 3),
    )
    apronGeo.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(apronColors, 3),
    )
    apronGeo.setIndex(apronIndices)

    const apronMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    })

    const apronMesh = new THREE.Mesh(apronGeo, apronMat)
    apronMesh.name = 'track-apron'
    group.add(apronMesh)
  }

  // 4. Start / Finish Line Mesh
  const s0 = samples[0]
  if (s0) {
    const p = s0.position
    const n = s0.normal
    const t = s0.tangent
    const hw = s0.halfWidth
    const lineThickness = 2.0 // 2 metres wide start finish line

    const linePositions = [
      p.x - n.x * hw - t.x * (lineThickness / 2),
      p.y + 0.08,
      p.z - n.z * hw - t.z * (lineThickness / 2),

      p.x + n.x * hw - t.x * (lineThickness / 2),
      p.y + 0.08,
      p.z + n.z * hw - t.z * (lineThickness / 2),

      p.x - n.x * hw + t.x * (lineThickness / 2),
      p.y + 0.08,
      p.z - n.z * hw + t.z * (lineThickness / 2),

      p.x + n.x * hw + t.x * (lineThickness / 2),
      p.y + 0.08,
      p.z + n.z * hw + t.z * (lineThickness / 2),
    ]

    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePositions, 3),
    )
    lineGeo.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3),
    )
    lineGeo.setIndex([0, 1, 2, 1, 3, 2])

    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    })
    const lineMesh = new THREE.Mesh(lineGeo, lineMat)
    lineMesh.name = 'start-finish-line'
    group.add(lineMesh)
  }

  // 5. Centerline Polyline (optional)
  if (showCenterline) {
    const centerPoints = samples.map(
      (s) => new THREE.Vector3(s.position.x, s.position.y + 0.1, s.position.z),
    )
    centerPoints.push(centerPoints[0].clone()) // Close loop
    const centerGeo = new THREE.BufferGeometry().setFromPoints(centerPoints)
    const centerMat = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 1,
    })
    const centerLine = new THREE.Line(centerGeo, centerMat)
    centerLine.name = 'track-centerline'
    group.add(centerLine)
  }

  // 6. Corner Marker Spheres/Discs
  if (showCornerMarkers) {
    const cornerGroup = new THREE.Group()
    cornerGroup.name = 'corner-markers'

    for (const corner of track.corners) {
      const markerGeo = new THREE.CylinderGeometry(4, 4, 0.5, 16)
      const markerMat = new THREE.MeshBasicMaterial({
        color: 0xffcc00,
      })
      const markerMesh = new THREE.Mesh(markerGeo, markerMat)
      markerMesh.position.set(
        corner.position.x,
        corner.position.y + 0.3,
        corner.position.z,
      )
      markerMesh.name = `corner-marker-${corner.number}`
      cornerGroup.add(markerMesh)
    }

    group.add(cornerGroup)
  }

  return group
}
