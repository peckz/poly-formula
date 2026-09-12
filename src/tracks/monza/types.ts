export type SurfaceType = 'asphalt' | 'gravel' | 'grass'

export interface TrackPoint {
  x: number
  y: number
  z: number
}

export interface CornerMarker {
  number: number
  name: string
  distance: number // Approximate lap distance in metres (0 to totalLength)
  description?: string
  position: TrackPoint
}

export interface TrackSegmentSpec {
  startDistance: number
  endDistance: number
  halfWidth: number // Track half-width (m), e.g. 5.0 to 6.0
  kerbWidthLeft: number // Kerb width (m), e.g. 0.0 to 1.0 (aggressive at chicanes)
  kerbWidthRight: number
  surfaceBeyondLeft: SurfaceType
  surfaceBeyondRight: SurfaceType
  apronWidthLeft?: number
  apronWidthRight?: number
}

export interface TrackSample {
  index: number
  distance: number
  t: number // 0 to 1 along closed loop
  position: TrackPoint
  tangent: TrackPoint
  normal: TrackPoint // Horizontal perpendicular vector (to the right of tangent)
  halfWidth: number
  kerbWidthLeft: number
  kerbWidthRight: number
  surfaceBeyondLeft: SurfaceType
  surfaceBeyondRight: SurfaceType
  apronWidthLeft: number
  apronWidthRight: number
}

export interface TrackData {
  id: string
  name: string
  country: string
  lengthMeters: number
  targetLapLengthMeters: number
  isClosedLoop: boolean
  clockwise: boolean
  description: string
  corners: CornerMarker[]
  controlPoints: TrackPoint[]
  samples: TrackSample[]
}
