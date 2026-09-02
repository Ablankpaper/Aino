import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { stubMenuDomApis, stubResizeObserver } from '@/test/jsdom'

const mocks = vi.hoisted(() => ({
  openSystem: vi.fn(),
  openCommandCenter: vi.fn(),
  requestGateway: vi.fn()
}))

vi.mock('@/app/shell/gateway-menu-panel', () => ({
  GatewayMenuPanel: ({ onOpenSystem }: { onOpenSystem: () => void }) => (
    <button onClick={onOpenSystem} type="button">
      Open system panel
    </button>
  )
}))

vi.mock('@/app/shell/hooks/use-status-snapshot', () => ({
  useStatusSnapshot: () => ({
    inferenceStatus: { checksDisagree: false, ready: true, reason: null, source: 'runtime_check' },
    statusSnapshot: null
  })
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tip: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

vi.mock('@/components/ui/glyph-spinner', () => ({
  GlyphSpinner: () => <span aria-hidden="true" />
}))

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: {
      common: { loading: 'Loading' },
      shell: {
        gatewayMenu: {
          checkingInference: 'Checking inference',
          connected: 'Connected',
          connecting: 'Connecting',
          disconnected: 'Disconnected',
          inferenceNotReady: 'Inference not ready',
          inferenceReady: 'Inference ready',
          messagingPlatforms: 'Messaging platforms',
          offline: 'Offline',
          openSystem: 'Open system panel',
          recentActivity: 'Recent activity',
          reconnectGateway: 'Reconnect gateway',
          state: (state: string) => state,
          viewAllLogs: 'View all logs'
        },
        statusbar: {
          gateway: 'Gateway',
          gatewayChecking: 'checking',
          gatewayConnecting: 'connecting',
          gatewayNeedsSetup: 'needs setup',
          gatewayOffline: 'offline',
          gatewayReady: 'ready',
          gatewayRestarting: 'restarting…',
          gatewayUnavailable: 'inference unavailable',
          openCommandCenter: 'Open Command Center'
        }
      }
    }
  })
}))

vi.mock('@/store/connections', async () => {
  const { atom } = await import('nanostores')

  return { $activeConnectionId: atom('local') }
})

vi.mock('@/store/profile', async () => {
  const { atom } = await import('nanostores')

  return { $activeGatewayProfile: atom('default') }
})

vi.mock('@/store/session', async () => {
  const { atom } = await import('nanostores')

  return { $gatewayState: atom('open') }
})

vi.mock('@/store/system-actions', async () => {
  const { atom } = await import('nanostores')

  return { $gatewayRestarting: atom(false) }
})

import { SettingsSystemControls } from './system-status-controls'

beforeAll(() => {
  stubMenuDomApis()
  stubResizeObserver()
})

beforeEach(() => {
  mocks.openSystem.mockReset()
  mocks.openCommandCenter.mockReset()
  mocks.requestGateway.mockReset()
})

afterEach(() => cleanup())

describe('SettingsSystemControls', () => {
  it('opens the command center from the settings footer', () => {
    render(
      <SettingsSystemControls
        onOpenCommandCenter={mocks.openCommandCenter}
        onOpenCommandCenterSection={mocks.openSystem}
        requestGateway={mocks.requestGateway}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Command Center' }))

    expect(mocks.openCommandCenter).toHaveBeenCalledOnce()
  })

  it('shows gateway readiness and routes the system action through the shared menu', async () => {
    render(
      <SettingsSystemControls
        onOpenCommandCenter={mocks.openCommandCenter}
        onOpenCommandCenterSection={mocks.openSystem}
        requestGateway={mocks.requestGateway}
      />
    )

    expect(screen.getByRole('button', { name: 'Gateway: ready' })).toBeTruthy()

    const gateway = screen.getByRole('button', { name: 'Gateway: ready' })
    fireEvent.pointerDown(gateway, { button: 0, pointerType: 'mouse' })
    fireEvent.click(gateway)
    fireEvent.click(await screen.findByRole('button', { name: 'Open system panel' }))

    expect(mocks.openSystem).toHaveBeenCalledOnce()
    expect(mocks.openSystem).toHaveBeenCalledWith('system')
  })
})
