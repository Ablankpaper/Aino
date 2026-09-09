import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  dismissNotification: vi.fn(),
  notify: vi.fn(() => 'notification-1'),
  notifyError: vi.fn()
}))

vi.mock('@/store/notifications', () => mocks)

import { setRuntimeI18nLocale } from '@/i18n'

import { surfaceModelSwitchConfirm } from './guarded-model-switch'

describe('guarded model switch copy', () => {
  beforeEach(() => {
    setRuntimeI18nLocale('zh')
    mocks.notify.mockClear()
  })

  afterEach(() => {
    setRuntimeI18nLocale('en')
  })

  it('localizes the fallback confirmation message for Simplified Chinese', () => {
    surfaceModelSwitchConfirm({
      confirmLabel: '确认',
      failureMessage: '模型切换失败',
      requestConfirmed: async () => undefined
    })

    expect(mocks.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '确认切换此模型？',
        title: '确认'
      })
    )
  })
})
