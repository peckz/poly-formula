import grid from './drivers.json' with { type: 'json' }

export type TeamId = keyof typeof grid.teams

export type TeamColors = {
  name: string
  primary: string
  secondary: string
}

export type Driver = {
  id: string
  name: string
  code: string
  number: number
  team: TeamId
}

export type CarPaint = {
  primary: number
  primaryDark: number
  secondary: number
}

const HEX = /^#?[0-9a-fA-F]{6}$/

export const TEAMS: Record<TeamId, TeamColors> = grid.teams

export const DRIVERS: Driver[] = grid.drivers.map((driver) => ({
  ...driver,
  team: driver.team as TeamId,
}))

function assertGrid() {
  if (DRIVERS.length !== 22) {
    throw new Error(`Expected 22 drivers, got ${DRIVERS.length}`)
  }
  const ids = new Set<string>()
  for (const driver of DRIVERS) {
    if (ids.has(driver.id)) {
      throw new Error(`Duplicate driver id ${driver.id}`)
    }
    ids.add(driver.id)
    if (!(driver.team in TEAMS)) {
      throw new Error(`Unknown team ${driver.team} for ${driver.id}`)
    }
  }
}

assertGrid()

export function hexToInt(hex: string): number {
  if (!HEX.test(hex)) {
    throw new Error(`Invalid hex color: ${hex}`)
  }
  const cleaned = hex.startsWith('#') ? hex.slice(1) : hex
  return Number.parseInt(cleaned, 16)
}

export function darkenHex(hex: string, amount = 0.22): number {
  const value = hexToInt(hex)
  const scale = 1 - amount
  const r = Math.round(((value >> 16) & 255) * scale)
  const g = Math.round(((value >> 8) & 255) * scale)
  const b = Math.round((value & 255) * scale)
  return (r << 16) | (g << 8) | b
}

export function teamOf(driver: Driver): TeamColors {
  return TEAMS[driver.team]
}

export function paintForTeam(teamId: TeamId): CarPaint {
  const team = TEAMS[teamId]
  return {
    primary: hexToInt(team.primary),
    primaryDark: darkenHex(team.primary),
    secondary: hexToInt(team.secondary),
  }
}

export function driverById(id: string): Driver {
  const driver = DRIVERS.find((entry) => entry.id === id)
  if (!driver) {
    throw new Error(`Unknown driver ${id}`)
  }
  return driver
}

export function paintForDriver(driver: Driver): CarPaint {
  return paintForTeam(driver.team)
}
