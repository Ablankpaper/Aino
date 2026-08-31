import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setRuntimeI18nLocale } from '@/i18n'

const themeState = vi.hoisted(() => ({
  availableThemes: [
    { label: 'Nous', name: 'nous' },
    { label: 'Ember', name: 'ember' }
  ],
  setTheme: vi.fn(),
  themeName: 'nous'
}))

vi.mock('./context', () => ({
  useTheme: () => themeState
}))

import { useSkinCommand } from './use-skin-command'

describe('useSkinCommand localization', () => {
  afterEach(() => {
    setRuntimeI18nLocale('en')
    themeState.setTheme.mockClear()
  })

  it('uses Simplified Chinese copy for switching and listing themes', () => {
    setRuntimeI18nLocale('zh')
    const { result } = renderHook(() => useSkinCommand())

    expect(result.current('next')).toBe('桌面主题已切换为 Ember。')
    expect(result.current('list')).toContain('桌面主题：')
    expect(result.current('list')).toContain('使用 /skin <name>，或使用 /skin 循环切换。')
  })
})
