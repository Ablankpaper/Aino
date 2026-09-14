import { describe, expect, it, vi } from 'vitest'

import type {
  PlatformAccountBridge,
  PlatformAccountSnapshot,
  PlatformPublicCapabilities
} from '../../shared/platform-contract'

import { createLegacyDevelopmentAccountActions, createPlatformAccountActions } from './platform'

const capabilities: PlatformPublicCapabilities = {
  desktop_api_version: 1,
  registration_enabled: true,
  phone_login_enabled: true,
  phone_registration_enabled: true,
  phone_binding_enabled: true,
  phone_regions: ['CN'],
  phone_code_length: 6,
  invitation_code_enabled: true,
  promo_code_enabled: false,
  login_agreement_enabled: true,
  login_agreement_mode: 'checkbox',
  login_agreement_revision: 'terms-7',
  login_agreement_documents: [{ id: 'terms', title: 'Terms', content_md: 'Current terms' }],
  captcha: { provider: 'disabled', site_key: '', scene_id: '', prefix: '', region: '' }
}

const signedOut: PlatformAccountSnapshot = {
  revision: 1,
  phase: 'signed_out',
  account: null,
  mode: 'development',
  remember_state: 'session_only',
  error: null
}

function platformBridge(overrides: Partial<PlatformAccountBridge> = {}): PlatformAccountBridge {
  return {
    status: vi.fn().mockResolvedValue(signedOut),
    capabilities: vi.fn().mockResolvedValue(capabilities),
    retry: vi.fn().mockResolvedValue(signedOut),
    requestPhoneCode: vi.fn().mockResolvedValue({
      challenge_id: 'challenge-1',
      expires_in: 300,
      retry_after: 47,
      delivery: 'accepted'
    }),
    verifyPhoneCode: vi.fn(),
    loginExisting: vi.fn(),
    completeSecondFactor: vi.fn(),
    updateProfile: vi.fn(),
    requestBindingCode: vi.fn(),
    submitStepUp: vi.fn(),
    bindPhone: vi.fn(),
    logout: vi.fn(),
    onChanged: vi.fn(() => () => {}),
    ...overrides
  }
}

describe('platform account adapter', () => {
  it('loads safe account and policy snapshots without treating a loopback API as fixed-code auth', async () => {
    const bridge = platformBridge()
    const actions = createPlatformAccountActions(bridge)

    await actions.refresh()

    expect(bridge.status).toHaveBeenCalledOnce()
    expect(bridge.capabilities).toHaveBeenCalledOnce()
    expect(actions.state.get()).toMatchObject({
      phase: 'signed_out',
      ready: true,
      adapter: 'platform',
      fixedCodeHint: false,
      capabilities: { phone_code_length: 6, invitation_code_enabled: true }
    })
  })

  it('sends the server policy fields with a phone verification', async () => {
    const snapshot: PlatformAccountSnapshot = {
      ...signedOut,
      revision: 2,
      phase: 'signed_in',
      account: { id: '17', display_name: '成员', phone_masked: '+86 138****8000', email: '' }
    }

    const verifyPhoneCode = vi.fn().mockResolvedValue({ status: 'signed_in', snapshot })
    const bridge = platformBridge({ verifyPhoneCode })
    const actions = createPlatformAccountActions(bridge)

    const result = await actions.verifyPhoneCode({
      phone: '+8613800138000',
      challenge_id: 'challenge-1',
      code: '246810',
      register_if_new: true,
      agreement_revision: 'terms-7',
      invitation_code: 'INVITE',
      remember: true
    })

    expect(result?.status).toBe('signed_in')
    expect(verifyPhoneCode).toHaveBeenCalledWith({
      phone: '+8613800138000',
      challenge_id: 'challenge-1',
      code: '246810',
      register_if_new: true,
      agreement_revision: 'terms-7',
      invitation_code: 'INVITE',
      remember: true
    })
    expect(actions.state.get().account).toEqual(snapshot.account)
  })

  it('keeps a signed-in snapshot offline and preserves structured retry timing', async () => {
    const offline: PlatformAccountSnapshot = {
      revision: 4,
      phase: 'offline',
      account: { id: '17', display_name: '成员', phone_masked: '+86 138****8000', email: '' },
      mode: 'production',
      remember_state: 'encrypted',
      error: { code: 'SMS_RATE_LIMITED', retry_after: 31 }
    }

    let listener: ((snapshot: PlatformAccountSnapshot) => void) | undefined

    const bridge = platformBridge({
      onChanged: vi.fn(callback => {
        listener = callback

        return () => {}
      })
    })

    const actions = createPlatformAccountActions(bridge)

    listener?.(offline)

    expect(actions.state.get()).toMatchObject({
      authenticated: true,
      phase: 'offline',
      account: { id: '17' },
      error: { code: 'SMS_RATE_LIMITED', retryAfter: 31 }
    })
  })

  it('lets the operation resolve when the native broadcast arrives before its IPC response', async () => {
    const next: PlatformAccountSnapshot = {
      ...signedOut,
      revision: 5,
      phase: 'signed_in',
      account: { id: '17', display_name: '成员', phone_masked: '+86 138****8000', email: '' }
    }

    let listener: ((snapshot: PlatformAccountSnapshot) => void) | undefined

    const bridge = platformBridge({
      verifyPhoneCode: vi.fn(async () => {
        listener?.(next)

        return { status: 'signed_in' as const, snapshot: next }
      }),
      onChanged: vi.fn(callback => {
        listener = callback

        return () => {}
      })
    })

    const actions = createPlatformAccountActions(bridge)

    const result = await actions.verifyPhoneCode({
      phone: '+8613800138000',
      challenge_id: 'challenge-1',
      code: '246810',
      register_if_new: false,
      agreement_revision: '',
      remember: false
    })

    expect(result?.status).toBe('signed_in')
    expect(actions.state.get().account?.id).toBe('17')
  })
})

describe('legacy development account adapter', () => {
  it('is an explicit fixed-code adapter and keeps gateway account records out of platform identity', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        authenticated: true,
        account: { id: 'local-only', identifier: 'dev@example.test', display_name: 'Local dev' },
        mode: 'development',
        capabilities: { code_login: true, wechat_login: false }
      })
      .mockResolvedValueOnce({ ok: true, delivery: 'development', expires_in: 600, retry_after: 60 })

    const actions = createLegacyDevelopmentAccountActions(request)

    await actions.refresh()
    await actions.requestPhoneCode('dev@example.test')

    expect(actions.state.get()).toMatchObject({
      adapter: 'legacy-development',
      fixedCodeHint: true,
      account: { id: 'local-only', email: 'dev@example.test' }
    })
    expect(request).toHaveBeenNthCalledWith(1, 'account.status')
    expect(request).toHaveBeenNthCalledWith(2, 'account.request_code', { identifier: 'dev@example.test' })
  })
})
