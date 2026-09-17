import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

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
import { registry } from '@/contrib/registry'
import { I18nProvider } from '@/i18n'
import { $summaryOpen } from '@/store/summary'
import { setTitlebarAppActionsSide } from '@/store/titlebar-app-actions'
import { stubResizeObserver } from '@/test/jsdom'

import { ROUTES_AREA } from '../routes'

import { TitlebarControls, type TitlebarTool } from './titlebar-controls'

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
  $summaryOpen.set(false)
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
  it('keeps summary open until toggled without replacing the saved layout or terminal tabs', async () => {
    const tree = split('column', [group(['workspace']), group(['terminal'])])
    $layoutTree.set(tree)
    const terminals = [{ auto: true, cwd: '/project', id: 'live-shell', kind: 'user' as const, title: 'zsh' }]
    $terminals.set(terminals)
    $activeTerminalId.set('live-shell')

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <MemoryRouter>
          <TitlebarControls />
          <button type="button">Outside</button>
        </MemoryRouter>
      </I18nProvider>
    )

    const button = screen.getByRole('button', { name: '会话摘要' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    await act(async () => fireEvent.click(button))
    expect($summaryOpen.get()).toBe(true)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.getAttribute('aria-expanded')).toBe('true')

    await act(async () => fireEvent.keyDown(button.ownerDocument, { key: 'Escape' }))
    expect($summaryOpen.get()).toBe(true)
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
    const outside = screen.getByRole('button', { name: 'Outside' })
    await act(async () => {
      fireEvent.pointerDown(outside, { button: 0, pointerType: 'mouse' })
      fireEvent.click(outside)
    })
    expect($summaryOpen.get()).toBe(true)

    await act(async () => fireEvent.click(button))
    expect($summaryOpen.get()).toBe(false)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect($layoutTree.get()).toBe(tree)
    expect($terminals.get()).toBe(terminals)
    expect($activeTerminalId.get()).toBe('live-shell')
  })

  it('retains the window-local summary choice when the toolbar remounts', async () => {
    const toolbar = (
      <I18nProvider configClient={null} initialLocale="zh">
        <MemoryRouter>
          <TitlebarControls />
        </MemoryRouter>
      </I18nProvider>
    )

    const view = render(toolbar)

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '会话摘要' })))
    view.unmount()
    render(toolbar)

    expect($summaryOpen.get()).toBe(true)
    expect(screen.getByRole('button', { name: '会话摘要' }).getAttribute('aria-expanded')).toBe('true')

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '会话摘要' })))
    expect($summaryOpen.get()).toBe(false)
  })
})

const PLUGIN_TOOL: TitlebarTool = { icon: <span />, id: 'plugin-tool', label: 'plugin tool' }

function renderControls(pathname: string, props?: { leftTools?: TitlebarTool[]; tools?: TitlebarTool[] }) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <I18nProvider configClient={null} initialLocale="en">
        <TitlebarControls leftTools={props?.leftTools} tools={props?.tools} />
      </I18nProvider>
    </MemoryRouter>
  )
}

const windowControls = () => screen.queryByLabelText('Window controls')
const appControls = () => screen.queryByLabelText('App controls')
const pluginChrome = () => screen.queryByText('plugin-chrome')
const pluginTool = () => screen.queryByLabelText('plugin tool')

describe('TitlebarControls fixed clusters', () => {
  let dispose: () => void

  beforeEach(() => {
    dispose = registry.registerMany([
      {
        area: ROUTES_AREA,
        data: { path: '/kanban' },
        id: 'test-kanban-route',
        render: () => null
      },
      {
        area: ROUTES_AREA,
        data: { path: '/plain' },
        id: 'test-plain-route',
        render: () => null
      }
    ])
  })

  afterEach(() => {
    dispose()
    cleanup()
  })

  it('keeps the app clusters on a contributed page that mounts no titlebar chrome', () => {
    renderControls('/plain')

    expect(windowControls()).not.toBeNull()
    expect(appControls()).not.toBeNull()
  })

  it('keeps the app clusters on chat', () => {
    renderControls('/')

    expect(windowControls()).not.toBeNull()
    expect(appControls()).not.toBeNull()
  })

  it('hides the app clusters on an overlay', () => {
    renderControls('/settings')

    expect(windowControls()).toBeNull()
    expect(appControls()).toBeNull()
  })

  it('keeps the app clusters on a first-party workspace page', () => {
    renderControls('/skills')

    expect(windowControls()).not.toBeNull()
    expect(appControls()).not.toBeNull()
  })

  it('a titleBar.tools item alone does not claim the band', () => {
    renderControls('/plain', { leftTools: [PLUGIN_TOOL] })

    expect(windowControls()).not.toBeNull()
    expect(pluginTool()).not.toBeNull()
  })

  describe('when the page projects titlebar chrome', () => {
    let disposeChrome: () => void

    beforeEach(() => {
      disposeChrome = registry.register({
        area: 'titleBar.center',
        id: 'test-plugin-chrome',
        render: () => <span>plugin-chrome</span>
      })
    })

    afterEach(() => {
      // The mounted controls subscribe to titleBar.* areas — dispose inside
      // act so the unmount-time registry update doesn't warn.
      act(() => disposeChrome())
    })

    it('hides the app clusters on a contributed full-page route', () => {
      renderControls('/kanban')

      expect(windowControls()).toBeNull()
      expect(appControls()).toBeNull()
    })

    it('keeps plugin titlebar contributions on a contributed full-page route', () => {
      renderControls('/kanban')

      expect(pluginChrome()).not.toBeNull()
      expect(windowControls()).toBeNull()
      expect(appControls()).toBeNull()
    })

    it('keeps contributed titlebar tools on a chrome-owning page', () => {
      renderControls('/kanban', { leftTools: [PLUGIN_TOOL] })

      expect(pluginTool()).not.toBeNull()
    })

    it('hides plugin titlebar contributions on an overlay', () => {
      renderControls('/settings')

      expect(pluginChrome()).toBeNull()
    })
  })
})

describe('titlebar app-action cluster', () => {
  afterEach(() => {
    setTitlebarAppActionsSide('right')
    cleanup()
  })

  it('defaults layout, HUD, and haptics to the right so the left titlebar stays free for tabs', () => {
    renderControls('/')

    const left = screen.getByLabelText('Window controls')
    const right = screen.getByLabelText('App controls')

    expect(within(right).getByLabelText('Mute haptics')).toBeTruthy()
    expect(within(right).getByLabelText('Layout editor')).toBeTruthy()
    expect(within(right).getByLabelText('HUD mode')).toBeTruthy()

    expect(within(left).queryByLabelText('Mute haptics')).toBeNull()
    expect(within(left).queryByLabelText('Layout editor')).toBeNull()
    expect(within(left).queryByLabelText('HUD mode')).toBeNull()
    expect(within(left).getByLabelText(/Hide sidebar|Show sidebar/)).toBeTruthy()
  })

  it('moves layout, HUD, and haptics to the left when the appearance setting says left', () => {
    setTitlebarAppActionsSide('left')
    renderControls('/')

    const left = screen.getByLabelText('Window controls')
    const right = screen.getByLabelText('App controls')

    expect(within(left).getByLabelText('Mute haptics')).toBeTruthy()
    expect(within(left).getByLabelText('Layout editor')).toBeTruthy()
    expect(within(left).getByLabelText('HUD mode')).toBeTruthy()
    expect(within(right).queryByLabelText('Mute haptics')).toBeNull()
  })
})
