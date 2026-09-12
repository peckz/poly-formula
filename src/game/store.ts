import { makeAutoObservable } from 'mobx'

export type SteerSource = 'keys' | 'wheel'

export type GamePhase = 'waiting' | 'running' | 'paused'

class RaceStore {
  phase: GamePhase = 'waiting'
  speedKmh = 0
  gear = 'N'
  lap = 1
  lapMs = 0
  lastLapMs: number | null = null
  steerSource: SteerSource = 'keys'
  offTrack = false
  cornerName = ''
  cornerDistM = 0
  slowing = false
  attacking = false
  boost = 0
  carX = 0
  carZ = 0

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  setPhase(phase: GamePhase) {
    this.phase = phase
  }

  update(frame: {
    speedKmh: number
    gear: string
    lap: number
    lapMs: number
    lastLapMs: number | null
    steerSource: SteerSource
    offTrack: boolean
    cornerName: string
    cornerDistM: number
    slowing: boolean
    attacking: boolean
    boost: number
    carX: number
    carZ: number
  }) {
    this.speedKmh = frame.speedKmh
    this.gear = frame.gear
    this.lap = frame.lap
    this.lapMs = frame.lapMs
    this.lastLapMs = frame.lastLapMs
    this.steerSource = frame.steerSource
    this.offTrack = frame.offTrack
    this.cornerName = frame.cornerName
    this.cornerDistM = frame.cornerDistM
    this.slowing = frame.slowing
    this.attacking = frame.attacking
    this.boost = frame.boost
    this.carX = frame.carX
    this.carZ = frame.carZ
  }
}

export const raceStore = new RaceStore()
