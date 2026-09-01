import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { notify, dispatchNativeNotification } = vi.hoisted(() => ({
  notify: vi.fn(),
  dispatchNativeNotification: vi.fn()
}))

vi.mock('@/store/notifications', () => ({ notify }))
vi.mock('@/store/native-notifications', () => ({ dispatchNativeNotification }))

import { setRuntimeI18nLocale } from '@/i18n'

import {
  $petGenDrafts,
  $petGenerateOpen,
  $petGenError,
  $petGenPreview,
  $petGenPrompt,
  $petGenSelected,
  $petGenStage,
  $petGenStatus,
  $petGenToken,
  adoptHatched,
  generateDrafts,
  hatchSelected,
  type PetDraft
} from './pet-generate'

const draft: PetDraft = { index: 0, dataUri: 'data:image/png;base64,draft' }

beforeEach(() => {
  setRuntimeI18nLocale('zh')
  notify.mockReset()
  dispatchNativeNotification.mockReset()
  $petGenerateOpen.set(false)
  $petGenStatus.set('idle')
  $petGenStage.set(null)
  $petGenError.set(null)
  $petGenDrafts.set([])
  $petGenPreview.set(null)
  $petGenSelected.set(null)
  $petGenToken.set(null)
  $petGenPrompt.set('')
})

afterEach(() => {
  setRuntimeI18nLocale('en')
})

describe('pet generation background notifications', () => {
  it('uses Simplified Chinese copy for ready notifications, including the view action', async () => {
    const request = vi.fn(async () => ({ ok: true, token: 'token-1', drafts: [draft] }))

    await expect(generateDrafts(request as never, { prompt: 'a pixel dragon' })).resolves.toBe(true)

    expect(notify).toHaveBeenCalledWith({
      action: { label: '查看', onClick: expect.any(Function) },
      kind: 'success',
      message: '宠物造型已完成——请选择一个进行孵化。',
      title: '宠物草图已就绪'
    })
  })

  it('uses Simplified Chinese copy when generation fails in the background', async () => {
    const request = vi.fn(async () => {
      throw new Error('provider unavailable')
    })

    await expect(generateDrafts(request as never, { prompt: 'a pixel dragon' })).resolves.toBe(false)

    expect(notify).toHaveBeenCalledWith({
      action: { label: '查看', onClick: expect.any(Function) },
      kind: 'error',
      message: '重新打开以重试。',
      title: '宠物生成失败'
    })
  })

  it('uses Simplified Chinese fallback copy when generation throws a non-Error', async () => {
    const request = vi.fn(async () => {
      throw 'provider unavailable'
    })

    await expect(generateDrafts(request as never, { prompt: 'a pixel dragon' })).resolves.toBe(false)

    expect($petGenError.get()).toBe('生成失败——请重试或选择一个建议。')
  })

  it('uses Simplified Chinese copy when generation returns no drafts', async () => {
    const request = vi.fn(async () => ({ drafts: [], ok: false, token: '' }))

    await expect(generateDrafts(request as never, { prompt: 'a pixel dragon' })).resolves.toBe(false)

    expect($petGenError.get()).toBe('生成失败——请重试或选择一个建议。')
  })

  it('uses Simplified Chinese fallback copy when hatching throws a non-Error', async () => {
    $petGenToken.set('token-1')
    $petGenSelected.set(0)
    $petGenPrompt.set('a pixel dragon')

    const request = vi.fn(async () => {
      throw 'provider unavailable'
    })

    await expect(hatchSelected(request as never, { name: 'Pixel Dragon' })).resolves.toBe(false)

    expect($petGenError.get()).toBe('孵化失败——请重试。')
  })

  it('uses Simplified Chinese copy when hatching returns no preview', async () => {
    $petGenToken.set('token-1')
    $petGenSelected.set(0)
    $petGenPrompt.set('a pixel dragon')

    const request = vi.fn(async () => ({ ok: false, pet: undefined, slug: '' }))

    await expect(hatchSelected(request as never, { name: 'Pixel Dragon' })).resolves.toBe(false)

    expect($petGenError.get()).toBe('孵化失败——请重试。')
  })

  it('uses Simplified Chinese fallback copy when adoption throws a non-Error', async () => {
    $petGenPreview.set({ enabled: true, slug: 'slug-1', displayName: 'Pixel Dragon' })

    const request = vi.fn(async () => {
      throw 'provider unavailable'
    })

    await expect(adoptHatched(request as never)).resolves.toMatchObject({ ok: false })

    expect($petGenError.get()).toBe('无法领养该宠物。')
  })

  it('uses Simplified Chinese copy when adoption is rejected', async () => {
    $petGenPreview.set({ enabled: true, slug: 'slug-1', displayName: 'Pixel Dragon' })

    const request = vi.fn(async () => ({ ok: false, slug: 'slug-1', displayName: 'Pixel Dragon' }))

    await expect(adoptHatched(request as never)).resolves.toMatchObject({ ok: false })

    expect($petGenError.get()).toBe('无法领养该宠物。')
  })
})
