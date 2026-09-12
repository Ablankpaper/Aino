import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { $terminalTakeover, setTerminalTakeover } from '@/app/right-sidebar/store'
import { $activeTerminalId, $terminals } from '@/app/right-sidebar/terminal/terminals'
import { group, split } from '@/components/pane-shell/tree/model'
import {
  $dismissedPanes,
  $hiddenTreePanes,
  $layoutTree,
  bindToolPaneCollapse,
  isPaneVisible,
  togglePaneVisible
} from '@/components/pane-shell/tree/store'
import { I18nProvider } from '@/i18n'
import { $summaryOpen, closeSummary } from '@/store/summary'
import { stubResizeObserver } from '@/test/jsdom'

import { TitlebarControls } from './titlebar-controls'

beforeAll(() => {
  stubResizeObserver()
  bindToolPaneCollapse(
    'terminal',
    $terminalTakeover,
    () => setTerminalTakeover(false),
    () => setTerminalTakeover(true)
  )
})

afterEach(() => {
  cleanup()
  setTerminalTakeover(false)
  $terminals.set([])
  $activeTerminalId.set(null)
  closeSummary()
})

describe('titlebar terminal toggle', () => {
  it('tracks the same visible pane as the keyboard command without replacing terminal tabs', () => {
    $dismissedPanes.set(new Set())
    $hiddenTreePanes.set(new Set())
    $layoutTree.set(split('column', [group(['workspace']), group(['terminal'], { minimized: true })]))
    const terminals = [{ auto: true, cwd: '/project', id: 'running-shell', kind: 'user' as const, title: 'zsh' }]
    $terminals.set(terminals)
    $activeTerminalId.set('running-shell')

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <MemoryRouter>
          <TitlebarControls />
        </MemoryRouter>
      </I18nProvider>
    )

    expect(screen.queryByRole('button', { name: '打开设置' })).toBeNull()
    expect(screen.getByRole('button', { name: '布局编辑器' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '显示终端' }))
    expect(isPaneVisible('terminal')).toBe(true)
    expect(screen.getByRole('button', { name: '隐藏终端' }).getAttribute('aria-pressed')).toBe('true')

    act(() => togglePaneVisible('terminal'))
    expect(screen.getByRole('button', { name: '显示终端' }).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: '显示终端' }))
    fireEvent.click(screen.getByRole('button', { name: '隐藏终端' }))
    expect(isPaneVisible('terminal')).toBe(false)
    expect($terminals.get()).toBe(terminals)
    expect($activeTerminalId.get()).toBe('running-shell')
  })
})

describe('titlebar summary toggle', () => {
  it('reflects the summary workspace state in aria-pressed', () => {
    $summaryOpen.set(false)

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <MemoryRouter>
          <TitlebarControls />
        </MemoryRouter>
      </I18nProvider>
    )

    const button = screen.getByRole('button', { name: '会话摘要' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(button)
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })
})
