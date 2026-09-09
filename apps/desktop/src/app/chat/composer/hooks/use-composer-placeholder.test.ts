import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { i18nState } = vi.hoisted(() => ({
  i18nState: {
    locale: 'en',
    t: {
      composer: {
        newSessionPlaceholders: ['English starter'],
        placeholderReconnecting: 'Reconnecting',
        placeholderStarting: 'Starting',
        followUpPlaceholders: ['English follow-up']
      },
      home: { placeholder: 'Ask anything' }
    }
  }
}))

vi.mock('@/i18n', () => ({
  useI18n: () => i18nState
}))

vi.mock('@/store/composer-input-history', () => ({
  resetBrowseState: vi.fn()
}))

vi.mock('../composer-utils', () => ({
  pickPlaceholder: (pool: readonly string[]) => pool[0]
}))

import { useComposerPlaceholder } from './use-composer-placeholder'

beforeEach(() => {
  i18nState.locale = 'en'
  i18nState.t = {
    composer: {
      newSessionPlaceholders: ['English starter'],
      placeholderReconnecting: 'Reconnecting',
      placeholderStarting: 'Starting',
      followUpPlaceholders: ['English follow-up']
    },
    home: { placeholder: 'Ask anything' }
  }
})

afterEach(() => cleanup())

describe('useComposerPlaceholder', () => {
  it('refreshes the visible starter after the persisted locale resolves', () => {
    const view = renderHook(() =>
      useComposerPlaceholder({
        disabled: false,
        reconnecting: false,
        sessionId: null
      })
    )

    expect(view.result.current).toBe('English starter')

    i18nState.locale = 'zh'
    i18nState.t = {
      composer: {
        newSessionPlaceholders: ['中文起始语'],
        placeholderReconnecting: '正在重新连接',
        placeholderStarting: '正在启动',
        followUpPlaceholders: ['中文后续消息']
      },
      home: { placeholder: '随便问点什么' }
    }
    view.rerender()

    expect(view.result.current).toBe('中文起始语')
  })

  it('uses the stable landing placeholder when the home layout is active', () => {
    const view = renderHook(() =>
      useComposerPlaceholder({
        disabled: false,
        homeLayout: true,
        reconnecting: false,
        sessionId: null
      })
    )

    expect(view.result.current).toBe('Ask anything')
  })
})
