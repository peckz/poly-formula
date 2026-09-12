import { makeAutoObservable, runInAction } from 'mobx'
import { fal } from '../fal/client'
import { fetchFalHealth, type FalHealth } from '../fal/health'
import { buildDriverAtlasPrompt } from '../fal/prompt'
import { setDriverAtlasUrl } from '../tracking/driver-sprite'
import { buildPlaceholderAvatar } from './placeholder'

/** Latest OpenAI image model on fal — Flare is the default 2.5 variant. */
const ATLAS_MODEL = 'openai/gpt-image-2.5/flare/text-to-image'
const NICKNAME_MAX = 20
const AVATAR_SUBJECT_MAX = 40

export type AvatarStatus = 'empty' | 'generating' | 'ready' | 'placeholder' | 'error'

export type FalStatus = 'unknown' | FalHealth

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Generation failed'
}

function firstImageUrl(data: unknown): string | null {
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

class EntryStore {
  /** Player display name — required to start. */
  nickname = ''
  /** Who fal should draw into the 5×5 head atlas. */
  avatarSubject = ''
  entered = false
  falStatus: FalStatus = 'unknown'
  avatarStatus: AvatarStatus = 'empty'
  /** URL of the generated 5×5 sprite atlas (or placeholder portrait). */
  avatarUrl: string | null = null
  avatarError: string | null = null

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  get trimmedNickname(): string {
    return this.nickname.trim()
  }

  get trimmedAvatarSubject(): string {
    return this.avatarSubject.trim()
  }

  get canStart(): boolean {
    return this.trimmedNickname.length > 0
  }

  get canGenerate(): boolean {
    return this.trimmedAvatarSubject.length > 0 && !this.generating
  }

  get generating(): boolean {
    return this.avatarStatus === 'generating'
  }

  setNickname(value: string) {
    this.nickname = value.slice(0, NICKNAME_MAX)
  }

  setAvatarSubject(value: string) {
    this.avatarSubject = value.slice(0, AVATAR_SUBJECT_MAX)
  }

  start() {
    if (!this.canStart) {
      return
    }
    this.nickname = this.trimmedNickname
    this.avatarSubject = this.trimmedAvatarSubject
    this.entered = true
  }

  applyPlaceholder(message: string, status: 'placeholder' | 'error') {
    const seed = this.trimmedAvatarSubject || this.trimmedNickname || 'driver'
    this.avatarUrl = buildPlaceholderAvatar(seed)
    this.avatarStatus = status
    this.avatarError = message
    // Keep the baked Leclerc atlas for head tracking when fal fails.
    setDriverAtlasUrl(null)
  }

  async checkFal() {
    const health = await fetchFalHealth()
    runInAction(() => {
      this.falStatus = health
    })
  }

  async generateAvatar() {
    if (!this.canGenerate) {
      return
    }

    this.avatarSubject = this.trimmedAvatarSubject
    this.avatarStatus = 'generating'
    this.avatarError = null

    const health = await fetchFalHealth()
    runInAction(() => {
      this.falStatus = health
    })

    if (health !== 'ready') {
      runInAction(() => {
        this.applyPlaceholder(
          'fal.ai key missing. Using a placeholder.',
          'placeholder',
        )
      })
      return
    }

    try {
      const result = await fal.subscribe(ATLAS_MODEL, {
        input: {
          prompt: buildDriverAtlasPrompt(this.trimmedAvatarSubject),
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
      setDriverAtlasUrl(url)
      runInAction(() => {
        this.avatarUrl = url
        this.avatarStatus = 'ready'
        this.avatarError = null
      })
    } catch (caught) {
      runInAction(() => {
        this.applyPlaceholder(errorMessage(caught), 'error')
      })
    }
  }
}

export const entryStore = new EntryStore()
export const NICKNAME_LIMIT = NICKNAME_MAX
export const AVATAR_SUBJECT_LIMIT = AVATAR_SUBJECT_MAX
