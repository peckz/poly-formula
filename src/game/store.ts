import { makeAutoObservable } from 'mobx'

export type SteerSource = 'keys' | 'wheel'

class RaceStore {
  speedKmh = 0
  gear = 'N'
  lap = 1
  steerSource: SteerSource = 'keys'
  offTrack = false
  cornerName = ''
  cornerDistM = 0
  cornerTargetKmh = 0
  brakeNow = false
  carX = 0
  carZ = 0

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  update(frame: {
    speedKmh: number
    gear: string
    lap: number
    steerSource: SteerSource
    offTrack: boolean
    cornerName: string
    cornerDistM: number
    cornerTargetKmh: number
    brakeNow: boolean
    carX: number
    carZ: number
  }) {
    this.speedKmh = frame.speedKmh
    this.gear = frame.gear
    this.lap = frame.lap
    this.steerSource = frame.steerSource
    this.offTrack = frame.offTrack
    this.cornerName = frame.cornerName
    this.cornerDistM = frame.cornerDistM
    this.cornerTargetKmh = frame.cornerTargetKmh
    this.brakeNow = frame.brakeNow
    this.carX = frame.carX
    this.carZ = frame.carZ
  }
}

export const raceStore = new RaceStore()
