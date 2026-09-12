/**
 * Offline atlas bake: call fal with FAL_KEY, download PNGs into public/sprites/drivers/.
 *
 * Prompt source of truth: `src/fal/prompt.ts` → `DRIVER_ATLAS_PROMPT`.
 * This script reads the synced copy at `src/fal/driver-atlas-prompt.txt`
 * (re-sync by copying the template literal body after editing prompt.ts).
 *
 * Usage:
 *   npm run generate:atlases
 *   npm run generate:atlases -- --only=leclerc,hamilton
 *   npm run generate:atlases -- --force
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fal } from '@fal-ai/client'

const ATLAS_MODEL = 'openai/gpt-image-2.5/flare/text-to-image'
const CONCURRENCY = 2

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'sprites', 'drivers')
const PROMPT_PATH = path.join(ROOT, 'src', 'fal', 'driver-atlas-prompt.txt')
const DRIVERS_PATH = path.join(ROOT, 'src', 'entry', 'drivers.json')

/** @typedef {{ id: string, name: string, team: string, number: number }} Driver */

function parseArgs(argv) {
  /** @type {{ force: boolean, only: Set<string> | null }} */
  const opts = { force: false, only: null }
  for (const arg of argv) {
    if (arg === '--force') {
      opts.force = true
      continue
    }
    if (arg.startsWith('--only=')) {
      opts.only = new Set(
        arg
          .slice('--only='.length)
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      )
    }
  }
  return opts
}

async function loadEnvFile() {
  try {
    const raw = await readFile(path.join(ROOT, '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }
      const eq = trimmed.indexOf('=')
      if (eq <= 0) {
        continue
      }
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {
    // .env optional if FAL_KEY already exported
  }
}

function buildPrompt(template, name) {
  return template.replaceAll('{{CHARACTER_NAME}}', name.trim() || 'a formula racer')
}

function firstImageUrl(data) {
  const url = data?.images?.[0]?.url
  return typeof url === 'string' && url.length > 0 ? url : null
}

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function generateOne(driver, promptTemplate) {
  const result = await fal.subscribe(ATLAS_MODEL, {
    input: {
      prompt: buildPrompt(promptTemplate, driver.name),
      image_size: 'square_hd',
      background: 'transparent',
      quality: 'high',
      output_format: 'png',
      num_images: 1,
    },
  })
  const url = firstImageUrl(result.data)
  if (!url) {
    throw new Error('No atlas returned')
  }
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const outPath = path.join(OUT_DIR, `${driver.id}-atlas.png`)
  await writeFile(outPath, buffer)
  return { outPath, bytes: buffer.length }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  await loadEnvFile()

  const key = process.env.FAL_KEY
  if (!key) {
    console.error('Missing FAL_KEY (set in .env or the environment).')
    process.exit(1)
  }

  fal.config({ credentials: key })

  /** @type {Driver[]} */
  const drivers = JSON.parse(await readFile(DRIVERS_PATH, 'utf8'))
  const promptTemplate = await readFile(PROMPT_PATH, 'utf8')
  await mkdir(OUT_DIR, { recursive: true })

  const selected = opts.only
    ? drivers.filter((d) => opts.only.has(d.id))
    : drivers

  if (selected.length === 0) {
    console.error('No drivers matched --only filter.')
    process.exit(1)
  }

  /** @type {Driver[]} */
  const queue = []
  for (const driver of selected) {
    const outPath = path.join(OUT_DIR, `${driver.id}-atlas.png`)
    if (!opts.force && (await fileExists(outPath))) {
      console.log(`skip  ${driver.id} (exists, use --force to redo)`)
      continue
    }
    queue.push(driver)
  }

  if (queue.length === 0) {
    console.log('Nothing to generate.')
    return
  }

  console.log(`Generating ${queue.length} atlas(es) → ${OUT_DIR}`)
  let cursor = 0
  let failed = 0

  async function worker() {
    while (true) {
      const index = cursor++
      if (index >= queue.length) {
        return
      }
      const driver = queue[index]
      process.stdout.write(`gen   ${driver.id} (${driver.name})… `)
      try {
        const { bytes } = await generateOne(driver, promptTemplate)
        console.log(`ok (${(bytes / 1024).toFixed(0)} KB)`)
      } catch (error) {
        failed += 1
        const message = error instanceof Error ? error.message : String(error)
        console.log(`FAIL: ${message}`)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
  )

  if (failed > 0) {
    console.error(`Done with ${failed} failure(s).`)
    process.exit(1)
  }
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
