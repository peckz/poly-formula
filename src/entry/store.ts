import { makeAutoObservable, runInAction } from 'mobx'
import { setDriverAtlasUrl } from '../tracking/driver-sprite'
import { generateDriverAtlas } from './atlas'
import { bundledAtlasUrl } from './atlas-paths'
import {
  DEFAULT_DRIVER_ID,
  DRIVERS_2026,
  type DriverInfo,
} from './drivers'
import { fetchFalHealth, type FalHealth } from '../fal/health'

const NICKNAME_MAX = 20

export type DriverSlotStatus = 'idle' | 'generating' | 'ready' | 'error'

export type DriverSlot = {
  driver: DriverInfo
  status: DriverSlotStatus
  atlasUrl: string | null
  error: string | null
}

export type FalStatus = 'unknown' | FalHealth

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Generation failed'
}

function bundledSlots(): DriverSlot[] {
  return DRIVERS_2026.map((driver) => ({
    driver,
    status: 'ready' as const,
    atlasUrl: bundledAtlasUrl(driver.id),
    error: null,
  }))
}

class EntryStore {
  nickname = ''
  entered = false
  falStatus: FalStatus = 'unknown'
  slots: DriverSlot[] = bundledSlots()
  selectedDriverId = DEFAULT_DRIVER_ID

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
    this.applySelectedAtlas()
  }

  get trimmedNickname(): string {
    return this.nickname.trim()
  }

  get canStart(): boolean {
    return this.trimmedNickname.length > 0
  }

  get selectedSlot(): DriverSlot {
    return (
      this.slots.find((slot) => slot.driver.id === this.selectedDriverId) ??
      this.slots[0]
    )
  }

  get selectedDriver(): DriverInfo {
    return this.selectedSlot.driver
  }

  get readyCount(): number {
    return this.slots.filter((slot) => slot.status === 'ready').length
  }

  get totalDrivers(): number {
    return this.slots.length
  }

  get previewAtlasUrl(): string | null {
    return this.selectedSlot.atlasUrl
  }

  setNickname(value: string) {
    this.nickname = value.slice(0, NICKNAME_MAX)
  }

  selectDriver(id: string) {
    if (!this.slots.some((slot) => slot.driver.id === id)) {
      return
    }
    this.selectedDriverId = id
    this.applySelectedAtlas()
  }

  applySelectedAtlas() {
    const url = this.selectedSlot.atlasUrl
    setDriverAtlasUrl(url)
  }

  start() {
    if (!this.canStart) {
      return
    }
    this.nickname = this.trimmedNickname
    this.applySelectedAtlas()
    this.entered = true
  }

  async checkFal() {
    const health = await fetchFalHealth()
    runInAction(() => {
      this.falStatus = health
    })
  }

  /** Re-roll a single driver via fal (runtime only — bake with npm run generate:atlases). */
  async regenerateSelected() {
    const id = this.selectedDriverId
    const slot = this.slots.find((item) => item.driver.id === id)
    if (!slot || this.falStatus !== 'ready' || slot.status === 'generating') {
      return
    }

    runInAction(() => {
      slot.status = 'generating'
      slot.error = null
    })

    try {
      const url = await generateDriverAtlas(slot.driver.name)
      runInAction(() => {
        slot.atlasUrl = url
        slot.status = 'ready'
        slot.error = null
        this.applySelectedAtlas()
      })
    } catch (caught) {
      runInAction(() => {
        slot.status = 'ready'
        slot.error = errorMessage(caught)
        slot.atlasUrl = bundledAtlasUrl(id)
        this.applySelectedAtlas()
      })
    }
  }
}

export const entryStore = new EntryStore()
export const NICKNAME_LIMIT = NICKNAME_MAX
