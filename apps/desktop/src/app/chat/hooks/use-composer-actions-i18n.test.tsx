// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'
import * as DesktopFs from '@/lib/desktop-fs'

import { useComposerActions } from './use-composer-actions'

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider configClient={null} initialLocale="zh">
    {children}
  </I18nProvider>
)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('composer native picker localization', () => {
  it('passes a Simplified Chinese title when choosing files', async () => {
    const selectPaths = vi.spyOn(DesktopFs, 'selectDesktopPaths').mockResolvedValue([])

    const { result } = renderHook(
      () => useComposerActions({ activeSessionId: null, currentCwd: '/repo', requestGateway: vi.fn() }),
      { wrapper }
    )

    await act(async () => {
      await result.current.pickContextPaths('file')
    })

    expect(selectPaths).toHaveBeenCalledWith({
      defaultPath: '/repo',
      directories: false,
      title: '添加文件作为上下文'
    })
  })

  it('passes a Simplified Chinese title when choosing folders', async () => {
    const selectPaths = vi.spyOn(DesktopFs, 'selectDesktopPaths').mockResolvedValue([])

    const { result } = renderHook(
      () => useComposerActions({ activeSessionId: null, currentCwd: '/repo', requestGateway: vi.fn() }),
      { wrapper }
    )

    await act(async () => {
      await result.current.pickContextPaths('folder')
    })

    expect(selectPaths).toHaveBeenCalledWith({
      defaultPath: '/repo',
      directories: true,
      title: '添加文件夹作为上下文'
    })
  })
})
