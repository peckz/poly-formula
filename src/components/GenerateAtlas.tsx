import { useState } from 'react'
import { generateDriverAtlas } from '../entry/atlas'

const DEFAULT_CHARACTER = 'charles leclerc'

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Generation failed'
}

export function GenerateAtlas() {
  const [character, setCharacter] = useState(DEFAULT_CHARACTER)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const generating = status === 'generating'

  async function generate() {
    setStatus('generating')
    setError(null)

    try {
      const url = await generateDriverAtlas(character)
      console.log('Generated atlas', url)
      setImageUrl(url)
      setStatus('idle')
    } catch (caught) {
      setStatus('error')
      setError(errorMessage(caught))
    }
  }

  return (
    <aside className="generate-atlas">
      <h2>Driver atlas</h2>
      <label htmlFor="atlas-character">Character</label>
      <input
        id="atlas-character"
        type="text"
        value={character}
        disabled={generating}
        onChange={(event) => {
          setCharacter(event.target.value)
        }}
      />
      <button type="button" disabled={generating} onClick={() => void generate()}>
        {generating ? 'Generating…' : 'Generate'}
      </button>
      {status === 'error' && error ? <p className="generate-atlas-error">{error}</p> : null}
      {imageUrl ? (
        <img src={imageUrl} alt={`Generated sprite atlas of ${character}`} />
      ) : null}
    </aside>
  )
}
