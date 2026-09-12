import { makeAutoObservable } from 'mobx'

export type SteerSource = 'keys' | 'wheel'

class RaceStore {
  speedKmh = 0
  gear = 'N'
  lap = 1
  steerSource: SteerSource = 'keys'
  offTrack = false

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  update(frame: {
    speedKmh: number
    gear: string
    lap: number
    steerSource: SteerSource
    offTrack: boolean
  }) {
    this.speedKmh = frame.speedKmh
    this.gear = frame.gear
    this.lap = frame.lap
    this.steerSource = frame.steerSource
    this.offTrack = frame.offTrack
  }
}

export const raceStore = new RaceStore()
