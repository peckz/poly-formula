import { makeAutoObservable, runInAction } from 'mobx'
import { fal } from '../fal/client'
import { fetchFalHealth, type FalHealth } from '../fal/health'
import { buildDriverAvatarPrompt } from '../fal/prompt'
import { buildPlaceholderAvatar } from './placeholder'

const AVATAR_MODEL = 'fal-ai/flux/schnell'
const NICKNAME_MAX = 20

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
  nickname = ''
  entered = false
  falStatus: FalStatus = 'unknown'
  avatarStatus: AvatarStatus = 'empty'
  avatarUrl: string | null = null
  avatarError: string | null = null

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  get trimmedNickname(): string {
    return this.nickname.trim()
  }

  get canStart(): boolean {
    return this.trimmedNickname.length > 0
  }

  get generating(): boolean {
    return this.avatarStatus === 'generating'
  }

  setNickname(value: string) {
    this.nickname = value.slice(0, NICKNAME_MAX)
  }

  start() {
    if (!this.canStart) {
      return
    }
    this.nickname = this.trimmedNickname
    this.entered = true
  }

  applyPlaceholder(message: string, status: 'placeholder' | 'error') {
    this.avatarUrl = buildPlaceholderAvatar(this.trimmedNickname)
    this.avatarStatus = status
    this.avatarError = message
  }

  async checkFal() {
    const health = await fetchFalHealth()
    runInAction(() => {
      this.falStatus = health
    })
  }

  async generateAvatar() {
    if (this.generating) {
      return
    }

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
      const result = await fal.subscribe(AVATAR_MODEL, {
        input: {
          prompt: buildDriverAvatarPrompt(this.trimmedNickname),
          image_size: 'square',
          num_images: 1,
        },
      })
      const url = firstImageUrl(result.data)
      if (!url) {
        throw new Error('No image returned')
      }
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
