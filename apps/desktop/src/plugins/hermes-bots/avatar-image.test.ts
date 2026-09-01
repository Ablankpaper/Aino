import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { hostMock, i18nMock } = vi.hoisted(() => ({
  hostMock: { notify: vi.fn(), request: vi.fn() },
  i18nMock: { t: vi.fn((key: string, ..._args: unknown[]) => key) }
}))

vi.mock('@hermes/plugin-sdk', async () => {
  const { atom } = await import('nanostores')

  return { atom, host: hostMock }
})

vi.mock('./shared', () => ({
  getPluginCtx: () => ({ i18n: i18nMock }),
  pluginText: (key: string, fallback: string, ...args: unknown[]) => {
    const translated = i18nMock.t(key, ...args)

    return translated && translated !== key ? translated : fallback
  }
}))

beforeEach(() => {
  vi.clearAllMocks()
  hostMock.request.mockResolvedValue({ success: false })
  i18nMock.t.mockImplementation((key: string) => (key === 'avatar.generationFailed' ? '头像生成失败' : key))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('avatar image generation', () => {
  it('uses the localized fallback when the gateway omits an error message', async () => {
    const { generateAvatarImage } = await import('./avatar-image')

    await expect(generateAvatarImage('researcher')).rejects.toThrow('头像生成失败')
  })
})

describe('device image picker', () => {
  it('keeps the upload-size notice readable when the translator returns a raw key', async () => {
    const input = {
      accept: '',
      click: vi.fn(),
      files: [{ size: 15_000_001 }],
      onchange: null as null | (() => void),
      type: ''
    }

    vi.spyOn(document, 'createElement').mockReturnValue(input as unknown as HTMLElement)

    const { pickImageFromDevice } = await import('./avatar-image')
    const pending = pickImageFromDevice()
    input.onchange?.()

    await expect(pending).resolves.toBeNull()
    expect(hostMock.notify).toHaveBeenCalledWith({
      kind: 'error',
      message: 'Image too large (max 15MB).'
    })
  })
})
