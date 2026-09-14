import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createPlatformAccountActions } from '@/api/platform'
import { I18nProvider } from '@/i18n'
import { setConnection, setGatewayState } from '@/store/session'
import { stubResizeObserver } from '@/test/jsdom'

import type {
  PlatformAccountBridge,
  PlatformAccountSnapshot,
  PlatformPublicCapabilities
} from '../../../shared/platform-contract'

import { AccountFlow, AccountGate, shouldGatePlatformAccount } from './account-gate'

stubResizeObserver()

const capabilities: PlatformPublicCapabilities = {
  desktop_api_version: 1,
  registration_enabled: true,
  phone_login_enabled: true,
  phone_registration_enabled: true,
  phone_binding_enabled: true,
  phone_regions: ['CN'],
  phone_code_length: 6,
  invitation_code_enabled: false,
  promo_code_enabled: false,
  login_agreement_enabled: false,
  login_agreement_mode: '',
  login_agreement_revision: '',
  login_agreement_documents: [],
  captcha: { provider: 'disabled', site_key: '', scene_id: '', prefix: '', region: '' }
}

function snapshot(
  phase: PlatformAccountSnapshot['phase'],
  account: PlatformAccountSnapshot['account'] = null
): PlatformAccountSnapshot {
  return {
    revision: 1,
    phase,
    account,
    mode: 'development',
    remember_state: 'session_only',
    error: null
  }
}

function bridge(current: PlatformAccountSnapshot) {
  const value: PlatformAccountBridge = {
    status: vi.fn().mockResolvedValue(current),
    capabilities: vi.fn().mockResolvedValue(capabilities),
    retry: vi.fn().mockResolvedValue(current),
    requestPhoneCode: vi.fn(),
    verifyPhoneCode: vi.fn(),
    loginExisting: vi.fn(),
    completeSecondFactor: vi.fn(),
    updateProfile: vi.fn(),
    requestBindingCode: vi.fn(),
    submitStepUp: vi.fn(),
    bindPhone: vi.fn(),
    logout: vi.fn(),
    onChanged: vi.fn(() => () => {})
  }

  return value
}

function renderFlow(actions: ReturnType<typeof createPlatformAccountActions>, child = <p>Workspace</p>) {
  return render(
    <I18nProvider configClient={null} initialLocale="zh">
      <MemoryRouter>
        <AccountFlow actions={actions}>{child}</AccountFlow>
      </MemoryRouter>
    </I18nProvider>
  )
}

beforeEach(() => {
  Object.defineProperty(window, 'hermesDesktop', {
    configurable: true,
    value: { ...(window.hermesDesktop ?? {}), setAccountWindowMode: vi.fn().mockResolvedValue(true) }
  })
})

afterEach(() => {
  cleanup()
  setConnection(null)
  setGatewayState('idle')
})

describe('standalone Aino account flow', () => {
  it('keeps the platform identity when the agent connection changes', async () => {
    const account = { id: '17', display_name: '成员', phone_masked: '+86 138****8000', email: '' }
    const platformBridge = bridge(snapshot('signed_in', account))
    const actions = createPlatformAccountActions(platformBridge)

    renderFlow(actions, <p>{account.display_name}</p>)
    expect(await screen.findByText('成员')).toBeTruthy()

    setConnection({ connectionId: 'another-connection' } as never)

    expect(await screen.findByText('成员')).toBeTruthy()
    expect(platformBridge.logout).not.toHaveBeenCalled()
  })

  it('allows platform sign-in while the agent gateway is unavailable and hides backend overlays', async () => {
    const platformBridge = bridge(snapshot('signed_out'))
    Object.defineProperty(window, 'hermesDesktop', {
      configurable: true,
      value: {
        ...(window.hermesDesktop ?? {}),
        platformAccount: platformBridge,
        setAccountWindowMode: vi.fn().mockResolvedValue(true)
      }
    })
    setGatewayState('closed')

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <MemoryRouter>
          <AccountGate>
            <p>Gateway connecting overlay</p>
          </AccountGate>
        </MemoryRouter>
      </I18nProvider>
    )

    const send = await screen.findByRole('button', { name: '发送验证码' })
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '+8613800138000' } })
    expect((send as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText('Gateway connecting overlay')).toBeNull()
    expect(platformBridge.status).toHaveBeenCalledOnce()
  })

  it('keeps an offline authenticated account in the recoverable workspace', async () => {
    const account = { id: '17', display_name: '成员', phone_masked: '+86 138****8000', email: '' }
    const actions = createPlatformAccountActions(bridge(snapshot('offline', account)))

    renderFlow(actions, <p>Offline workspace</p>)

    expect(await screen.findByText('Offline workspace')).toBeTruthy()
    expect(screen.queryByRole('main', { name: '登录 Aino' })).toBeNull()
  })

  it('gates primary and session windows but leaves denied auxiliary renderers intact', () => {
    expect(shouldGatePlatformAccount('')).toBe(true)
    expect(shouldGatePlatformAccount('?win=secondary')).toBe(true)
    expect(shouldGatePlatformAccount('?peer=1')).toBe(true)
    expect(shouldGatePlatformAccount('?win=hud')).toBe(false)
    expect(shouldGatePlatformAccount('?win=browser&tab=one')).toBe(false)
  })
})
