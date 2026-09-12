/**
 * 2026 F1 grid (22 cars / 11 teams) for the entry picker.
 *
 * Source: FIA 2026 entry list (published Dec 2025; Crash.net summary) and
 * formula1.com “Who are the 2026 Formula 1 drivers?” (Jan 2026).
 * `name` matches the FIA entry spelling used for fal prompts.
 */
import driversJson from './drivers.json'

export type DriverInfo = {
  id: string
  name: string
  team: string
  number: number
}

export const DRIVERS_2026: DriverInfo[] = driversJson

export const DEFAULT_DRIVER_ID = 'leclerc'
