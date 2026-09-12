const DRIVER_ATLAS_PROMPT = `Create a single game-ready sprite atlas depicting {{CHARACTER_NAME}} as a recognizable low-poly retro video-game avatar.

STYLE
PlayStation 1–inspired 3D character rendered as pixelated 2D sprites. Angular facial geometry, flat polygon shading, simple textures, limited colors. Preserve the subject’s recognizable facial features, hairstyle, and characteristic appearance. Choose one recognizable outfit and keep it identical throughout. No text, logos, accessories obscuring the face, or objects.

ATLAS LAYOUT
Exactly 25 portraits arranged in a strict 5-column × 5-row grid on one square image.
Every cell must have identical dimensions.
No gutters, borders, labels, captions, or decorative elements.
Each portrait must stay completely inside its cell.
The center cell—row 3, column 3—is the neutral, straight-on portrait.

POSE MAPPING
Directions refer to the viewer’s screen.

Columns, left to right:
1. Face turned 35 degrees toward screen-left.
2. Face turned 18 degrees toward screen-left.
3. Face looking straight at the viewer.
4. Face turned 18 degrees toward screen-right.
5. Face turned 35 degrees toward screen-right.

Rows, top to bottom:
1. Head tilted downward 25 degrees.
2. Head tilted downward 12 degrees.
3. Head held level.
4. Head tilted upward 12 degrees.
5. Head tilted upward 25 degrees.

Each cell combines its column’s horizontal turn with its row’s vertical tilt. Render every combination exactly once. No sideways head tilt: keep roll at zero.

CONSISTENCY
All 25 portraits depict the exact same character model, hairstyle, clothing, expression, proportions, colors, and lighting.
Use a relaxed, neutral expression with the mouth closed.
Only head yaw and pitch change.
Keep the camera fixed, with identical distance, framing, and scale across all cells.
Use a consistent rotation pivot at the center of the head; do not independently resize or recenter individual poses.

FRAMING
Compose each cell as a classic racing-game bust, not a floating head.
Always show the full hairstyle, full head, full neck, collar, and clear upper shoulders / upper chest of the racing suit.
Never crop hard under the chin or at mid-neck — leave a visible shoulder shelf so the silhouette reads as a torso, not a severed head.
In the neutral pose, place the eye midpoint near the horizontal center and about 38–42% down the cell so the shoulders sit in the lower third.
Keep identical bust scale in every cell; do not zoom in on the face for tilted poses.
Leave transparent padding around hair and shoulders so nothing clips the cell edge.

BACKGROUND
Genuine transparent alpha background, including gaps around hair, neck, and shoulders.
Do not draw a checkerboard, solid backdrop, scenery, floor, or cast shadow.

OUTPUT
Only the finished square 5×5 sprite atlas. Crisp, readable facial silhouettes suitable for sampling each cell at low resolution and using it as a webcam-controlled avatar.`

export function buildDriverAtlasPrompt(character: string): string {
  const name = character.trim() || 'a formula racer'
  return DRIVER_ATLAS_PROMPT.replaceAll('{{CHARACTER_NAME}}', name)
}

const DRIVER_AVATAR_PROMPT = `Use case: stylized-concept. Square portrait of {{name}} as a recognizable low-poly retro PlayStation 1 racing-game driver. Head and upper shoulders only. Flat faceted polygon geometry, crunchy limited palette, NOT photorealistic. Simple racing suit with no text or logos. Genuine transparent alpha background. Bust centered with even padding. Crisp deliberately low-resolution video game sprite art. Output only the portrait.`

export function buildDriverAvatarPrompt(name: string): string {
  const character = name.trim() || 'a formula racer'
  return DRIVER_AVATAR_PROMPT.replaceAll('{{name}}', character)
}
