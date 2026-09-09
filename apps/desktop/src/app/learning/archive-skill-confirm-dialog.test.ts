import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as HermesModule from '@/hermes'

const { deleteLearningNode } = vi.hoisted(() => ({
  deleteLearningNode: vi.fn()
}))

vi.mock('@/hermes', async importOriginal => {
  const actual = await importOriginal<typeof HermesModule>()

  return { ...actual, deleteLearningNode }
})

import { setRuntimeI18nLocale } from '@/i18n'

import { archiveLearningSkill } from './archive-skill-confirm-dialog'

describe('archiveLearningSkill', () => {
  beforeEach(() => {
    setRuntimeI18nLocale('zh')
    deleteLearningNode.mockReset()
  })

  afterEach(() => {
    setRuntimeI18nLocale('en')
  })

  it('uses the localized fallback when the backend omits an archive error message', async () => {
    deleteLearningNode.mockResolvedValue({ message: '', ok: false })

    await expect(archiveLearningSkill('skill-id')).rejects.toThrow('归档失败')
  })
})
