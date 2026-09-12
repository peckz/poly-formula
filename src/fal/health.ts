export type FalHealth = 'ready' | 'missing'

export async function fetchFalHealth(): Promise<FalHealth> {
  try {
    const response = await fetch('/api/fal/health')
    if (!response.ok) {
      return 'missing'
    }
    const data = (await response.json()) as { configured?: boolean }
    return data.configured ? 'ready' : 'missing'
  } catch {
    return 'missing'
  }
}
