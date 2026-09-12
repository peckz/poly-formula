import { fal } from '../fal/client'
import { buildDriverAtlasPrompt } from '../fal/prompt'

/** Latest OpenAI image model on fal — Flare is the default 2.5 variant. */
export const ATLAS_MODEL = 'openai/gpt-image-2.5/flare/text-to-image'

export type AtlasInput = {
  prompt: string
  image_size: 'square_hd'
  background: 'transparent'
  quality: 'high'
  output_format: 'png'
  num_images: 1
}

export function atlasRequestInput(character: string): AtlasInput {
  return {
    prompt: buildDriverAtlasPrompt(character),
    image_size: 'square_hd',
    background: 'transparent',
    quality: 'high',
    output_format: 'png',
    num_images: 1,
  }
}

export function firstImageUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null
  }
  const images = (data as { images?: Array<{ url?: string }> }).images
  const url = images?.[0]?.url
  if (typeof url !== 'string' || url.length === 0) {
    return null
  }
  return url
}

export async function generateDriverAtlas(character: string): Promise<string> {
  const result = await fal.subscribe(ATLAS_MODEL, {
    input: atlasRequestInput(character),
  })
  const url = firstImageUrl(result.data)
  if (!url) {
    throw new Error('No atlas returned')
  }
  return url
}
