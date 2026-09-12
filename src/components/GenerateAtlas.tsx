import { useState } from 'react'
import { fal } from '../fal/client'
import { buildDriverAtlasPrompt } from '../fal/prompt'

const MODEL_ID = 'fal-ai/gpt-image-1/text-to-image'
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
      const result = await fal.subscribe(MODEL_ID, {
        input: {
          prompt: buildDriverAtlasPrompt(character),
          image_size: '1024x1024',
        },
      })
      const url = result.data.images[0]?.url
      if (!url) {
        throw new Error('No image returned')
      }
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
