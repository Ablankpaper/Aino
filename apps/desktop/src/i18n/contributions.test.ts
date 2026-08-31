import { describe, expect, it } from 'vitest'

import { localizedLayoutTitle, localizedPaletteLabel, localizedPaneTitle } from './contributions'
import { en } from './en'
import { zh } from './zh'

describe('core contribution display copy', () => {
  it('localizes the built-in pane titles without changing plugin titles', () => {
    expect(localizedPaneTitle(zh, 'sessions', 'sessions', undefined)).toBe('会话')
    expect(localizedPaneTitle(zh, 'terminal', 'terminal', 'core')).toBe('终端')
    expect(localizedPaneTitle(zh, 'terminal', 'Custom terminal', 'plugin:custom')).toBe('Custom terminal')
  })

  it('localizes built-in layout preset names while preserving custom names', () => {
    expect(localizedLayoutTitle(zh, 'default', 'Default', undefined)).toBe('默认')
    expect(localizedLayoutTitle(zh, 'terminal-deck', 'Terminal deck', 'core')).toBe('终端布局')
    expect(localizedLayoutTitle(zh, 'user-layout', '我的布局', 'user')).toBe('我的布局')
  })

  it('resolves palette labels from the active locale and falls back for plugins', () => {
    expect(localizedPaletteLabel(zh, 'view.toggleStatusbar', 'Toggle status bar', undefined)).toBe('切换状态栏')
    expect(localizedPaletteLabel(en, 'view.toggleStatusbar', 'Toggle status bar', 'core')).toBe('Toggle status bar')
    expect(localizedPaletteLabel(zh, 'plugin:custom:action', 'Custom action', 'plugin:custom')).toBe('Custom action')
  })
})
