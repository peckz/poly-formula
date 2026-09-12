const DRIVER_ATLAS_PROMPT = `Use case: stylized-concept. Asset type: a single production game sprite atlas, exactly 5 columns by 5 rows, 25 frames. Create a square spritesheet of {{charles lecler}} as a recognizable low-poly retro PlayStation 1 racing-game character, brown short parted hair, strong brows, light stubble, red racing suit with no text or logos. Head and upper shoulders only. Flat faceted polygon geometry, crunchy low-resolution pixelated textures, limited palette, NOT photorealistic. All 25 cells exactly equal in size, no gutters, no borders, no text, no labels. Consistent plain dark navy background #101827 in every cell. Every bust centered at precisely the center of its own cell with generous 15% padding, never crosses cell boundaries. Same identity, lighting and red suit in every cell. Columns from left to right: head turned toward viewer's left 35 degrees, left 18 degrees, straight-on, toward viewer's right 18 degrees, right 35 degrees. Rows top to bottom: head tilted down 25 degrees, down 12 degrees, neutral pitch, up 12 degrees, up 25 degrees. Each row contains exactly those same five yaw angles. Third row third column is the neutral front-facing portrait. Uniform camera distance and bust scale in all frames. Crisp deliberately low-resolution video game sprite art. Output only the sprite atlas.`

export function buildDriverAtlasPrompt(character: string): string {
  return DRIVER_ATLAS_PROMPT.replaceAll('{{charles lecler}}', character)
}

const DRIVER_AVATAR_PROMPT = `Use case: stylized-concept. Square portrait of {{name}} as a recognizable low-poly retro PlayStation 1 racing-game driver. Head and upper shoulders only. Flat faceted polygon geometry, crunchy limited palette, NOT photorealistic. Simple red racing suit with no text or logos. Plain pale sky background #a9c3e0. Bust centered with even padding. Crisp deliberately low-resolution video game sprite art. Output only the portrait.`

export function buildDriverAvatarPrompt(name: string): string {
  const character = name.trim() || 'a formula racer'
  return DRIVER_AVATAR_PROMPT.replaceAll('{{name}}', character)
}
