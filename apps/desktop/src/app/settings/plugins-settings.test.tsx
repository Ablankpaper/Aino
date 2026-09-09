import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { requestGateway, getProfiles, notifyError } = vi.hoisted(() => ({
  requestGateway: vi.fn(),
  getProfiles: vi.fn<() => Promise<{ profiles: { name: string; is_default: boolean }[] }>>(async () => ({
    profiles: []
  })),
  notifyError: vi.fn()
}))

vi.mock('@/app/gateway/hooks/use-gateway-request', () => ({
  useGatewayRequest: () => ({ requestGateway })
}))

vi.mock('@/hermes', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getProfiles
}))

vi.mock('@/store/notifications', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notifyError
}))

import { $pluginRecords } from '@/contrib/plugins-store'
import type { PluginRecord } from '@/contrib/plugins-store'
import { I18nProvider } from '@/i18n'
import { queryClient } from '@/lib/query-client'
import {
  $agentPluginBusy,
  $agentPlugins,
  $agentPluginsError,
  $agentPluginsStatus,
  type AgentPluginRow
} from '@/store/agent-plugins'
import { $activeGatewayProfile } from '@/store/profile'
import { $connection, $gatewayState } from '@/store/session'

import { PluginsSettings } from './plugins-settings'

const legacyRow = {
  name: 'Legacy plugin',
  version: '0.20.0',
  description: 'Returned by a pre-key backend',
  source: 'user',
  status: 'disabled'
} satisfies AgentPluginRow

const renderSettings = (locale: 'en' | 'zh' = 'en') =>
  render(
    <I18nProvider configClient={null} initialLocale={locale}>
      <QueryClientProvider client={queryClient}>
        <PluginsSettings />
      </QueryClientProvider>
    </I18nProvider>
  )

beforeEach(() => {
  requestGateway.mockReset()
  getProfiles.mockReset()
  notifyError.mockReset()
  getProfiles.mockResolvedValue({ profiles: [] })
  queryClient.clear()
  $pluginRecords.set({})
  $agentPlugins.set([legacyRow])
  $agentPluginsStatus.set('ready')
  $agentPluginsError.set(null)
  $agentPluginBusy.set(null)
  $gatewayState.set('idle')
  $connection.set(null)
  $activeGatewayProfile.set('default')
  Reflect.deleteProperty(window, 'hermesDesktop')
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(window, 'hermesDesktop')
  vi.restoreAllMocks()
})

describe('PluginsSettings', () => {
  it('renders explicitly localized desktop plugin metadata for the active locale', () => {
    const localizedRecord = {
      id: 'accent',
      name: 'Accent Picker',
      description: 'Pick the theme accent.',
      kind: 'bundled',
      status: 'loaded',
      localized: {
        zh: {
          name: '强调色选择器',
          description: '从状态栏选择主题强调色。'
        }
      }
    } as unknown as PluginRecord

    $pluginRecords.set({ [localizedRecord.id]: localizedRecord })

    renderSettings('zh')

    expect(screen.getByText('强调色选择器')).toBeTruthy()
    expect(screen.getByText('从状态栏选择主题强调色。')).toBeTruthy()
    expect(screen.queryByText('Accent Picker')).toBeNull()
  })

  it('renders and searches plugin rows returned without a canonical key', () => {
    renderSettings()

    expect(screen.getByText('Legacy plugin')).toBeTruthy()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'pre-key' } })

    expect(screen.getByText('Legacy plugin')).toBeTruthy()
  })

  it('renders keyless rows read-only instead of falling back to name-addressed toggles', () => {
    // Name-addressed toggles flip every same-named plugin across category
    // dirs (image_gen/fal vs video_gen/fal) — the reason toggles moved to
    // canonical keys. A pre-contract-v6 row must never reach the RPC.
    renderSettings()

    const toggle = screen.getByRole('switch', { name: 'Enable Legacy plugin' })

    expect(toggle.hasAttribute('disabled') || toggle.getAttribute('aria-disabled') === 'true').toBe(true)

    fireEvent.click(toggle)

    expect(requestGateway).not.toHaveBeenCalledWith('plugins.manage', expect.objectContaining({ action: 'toggle' }))
  })

  it('keeps duplicate-named keyless rows distinct (no React key collision)', () => {
    const sibling = {
      ...legacyRow,
      description: 'A second plugin category with the same legacy name'
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    $agentPlugins.set([legacyRow, sibling])

    renderSettings()

    expect(screen.getAllByRole('switch', { name: 'Enable Legacy plugin' })).toHaveLength(2)
    expect(screen.getByText(sibling.description)).toBeTruthy()
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('same key')
  })

  it('keeps using the canonical key when the backend provides one', async () => {
    const keyedRow = { ...legacyRow, key: 'image_gen/legacy' }

    $agentPlugins.set([keyedRow])
    requestGateway.mockResolvedValue({ ok: true, plugin: { ...keyedRow, status: 'enabled' } })

    renderSettings()
    fireEvent.click(screen.getByRole('switch', { name: 'Enable Legacy plugin' }))

    await waitFor(() =>
      expect(requestGateway).toHaveBeenCalledWith('plugins.manage', {
        action: 'toggle',
        key: 'image_gen/legacy',
        enable: true
      })
    )
  })

  it('hides repo-bundled built-ins and keeps the count pill in sync', () => {
    // The Agent plugins section is the control panel for plugins the USER
    // installed — built-ins (browser backends, cron providers, model
    // providers…) ship enabled-by-default and are configured elsewhere.
    $agentPlugins.set([
      legacyRow,
      { ...legacyRow, name: 'browserbase', key: 'browser/browserbase', source: 'bundled' },
      { ...legacyRow, name: 'chronos', key: 'cron_providers/chronos', source: 'bundled' },
      { ...legacyRow, name: 'deepinfra', key: 'model-providers/deepinfra', source: 'bundled' }
    ])

    renderSettings()

    expect(screen.getByText('Legacy plugin')).toBeTruthy()
    expect(screen.queryByText('browserbase')).toBeNull()
    expect(screen.queryByText('chronos')).toBeNull()
    expect(screen.queryByText('deepinfra')).toBeNull()
    // Count pill reflects the filtered list, not the raw RPC row count.
    expect(screen.getByText('1 installed', { exact: false })).toBeTruthy()
  })

  it('hides legacy other-surface categories even when the backend omits source', () => {
    // Older backends may not report source reliably — the key-prefix
    // fallback still hides categories other surfaces own.
    $agentPlugins.set([{ ...legacyRow, name: 'deepinfra', key: 'model-providers/deepinfra', source: 'user' }])

    renderSettings()

    expect(screen.queryByText('deepinfra')).toBeNull()
  })

  it('shows no profile selector with a single profile', async () => {
    getProfiles.mockResolvedValue({ profiles: [{ name: 'default', is_default: true }] })

    renderSettings()

    await waitFor(() => expect(getProfiles).toHaveBeenCalled())
    expect(screen.queryByText('Applies to:')).toBeNull()
  })

  it('lists the active profile scope without a profile param and reloads scoped on change', async () => {
    getProfiles.mockResolvedValue({
      profiles: [
        { name: 'default', is_default: true },
        { name: 'work', is_default: false }
      ]
    })
    requestGateway.mockResolvedValue({ plugins: [legacyRow] })
    $gatewayState.set('open')

    renderSettings()

    // Active profile scope: no profile param — older backends unchanged.
    await waitFor(() => expect(requestGateway).toHaveBeenCalledWith('plugins.manage', { action: 'list' }))
    await waitFor(() => expect(screen.getByText('Applies to:')).toBeTruthy())
  })

  it('sends toggles through the selected profile scope', async () => {
    // jsdom's scrollIntoView is missing/non-functional; Radix Select calls it
    // when the dropdown opens.
    Element.prototype.scrollIntoView = vi.fn()

    const keyedRow = { ...legacyRow, key: 'image_gen/legacy' }

    getProfiles.mockResolvedValue({
      profiles: [
        { name: 'default', is_default: true },
        { name: 'work', is_default: false }
      ]
    })
    requestGateway.mockImplementation(async (method: string, params?: Record<string, unknown>) => {
      if (params?.action === 'list') {
        return { plugins: [keyedRow] }
      }

      return { ok: true, plugin: { ...keyedRow, status: 'enabled' } }
    })
    $gatewayState.set('open')

    renderSettings()

    await waitFor(() => expect(screen.getByText('Applies to:')).toBeTruthy())

    // Select the non-active profile scope.
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(await screen.findByText('work'))

    await waitFor(() =>
      expect(requestGateway).toHaveBeenCalledWith('plugins.manage', { action: 'list', profile: 'work' })
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Enable Legacy plugin' }))

    await waitFor(() =>
      expect(requestGateway).toHaveBeenCalledWith('plugins.manage', {
        action: 'toggle',
        key: 'image_gen/legacy',
        enable: true,
        profile: 'work'
      })
    )
  })

  it('uses Chinese copy when the desktop plugin root is unavailable', async () => {
    const desktopPluginsRoot = vi.fn<NonNullable<Window['hermesDesktop']['desktopPluginsRoot']>>().mockResolvedValue('')

    const openDir = vi.fn<NonNullable<Window['hermesDesktop']['openDir']>>()

    ;(window as unknown as { hermesDesktop: unknown }).hermesDesktop = { desktopPluginsRoot, openDir }

    renderSettings('zh')
    fireEvent.click(screen.getAllByRole('button', { name: '打开插件文件夹' })[0])

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('桌面插件不可用', '无法解析插件文件夹'))
    expect(openDir).not.toHaveBeenCalled()
  })

  it('uses Chinese copy when opening the desktop plugin folder fails without a detail', async () => {
    const desktopPluginsRoot = vi
      .fn<NonNullable<Window['hermesDesktop']['desktopPluginsRoot']>>()
      .mockResolvedValue('/tmp/desktop-plugins')

    const openDir = vi.fn<NonNullable<Window['hermesDesktop']['openDir']>>().mockResolvedValue({ ok: false })

    ;(window as unknown as { hermesDesktop: unknown }).hermesDesktop = { desktopPluginsRoot, openDir }

    renderSettings('zh')
    fireEvent.click(screen.getAllByRole('button', { name: '打开插件文件夹' })[0])

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('未知错误', '无法打开插件文件夹'))
    expect(openDir).toHaveBeenCalledWith('/tmp/desktop-plugins')
  })

  it('uses Chinese copy when the backend does not report its plugin home', async () => {
    requestGateway.mockResolvedValue({})

    const openDir = vi.fn<NonNullable<Window['hermesDesktop']['openDir']>>()

    ;(window as unknown as { hermesDesktop: unknown }).hermesDesktop = { openDir }

    renderSettings('zh')
    fireEvent.click(screen.getAllByRole('button', { name: '打开插件文件夹' })[1])

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('后端未提供其主目录', '无法打开插件文件夹'))
    expect(openDir).not.toHaveBeenCalled()
  })

  it('uses Chinese copy when opening the agent plugin folder fails without a detail', async () => {
    requestGateway.mockResolvedValue({ home: '/tmp/hermes' })

    const openDir = vi.fn<NonNullable<Window['hermesDesktop']['openDir']>>().mockResolvedValue({ ok: false })

    ;(window as unknown as { hermesDesktop: unknown }).hermesDesktop = { openDir }

    renderSettings('zh')
    fireEvent.click(screen.getAllByRole('button', { name: '打开插件文件夹' })[1])

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('未知错误', '无法打开插件文件夹'))
    expect(openDir).toHaveBeenCalledWith('/tmp/hermes/plugins')
  })
})
