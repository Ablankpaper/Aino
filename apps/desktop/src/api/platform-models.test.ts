import { JsonRpcGatewayError } from '@hermes/shared'
import { afterEach, expect, it, vi } from 'vitest'

import { requestGatewayForAgent } from '@/store/gateway'

import type { PlatformAccountSnapshot, PlatformModelsBridge } from '../../shared/platform-contract'

import { bindPlatformModel } from './platform-models'

vi.mock('@/store/gateway', () => ({ requestGatewayForAgent: vi.fn() }))
afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'hermesDesktop')
})

it('requests the ticket on the session owner route before calling the native binding bridge', async () => {
  const account: PlatformAccountSnapshot = {
    revision: 7,
    phase: 'signed_in',
    account: { id: '17', display_name: 'Fixture', email: '', phone_masked: '' },
    mode: 'development',
    remember_state: 'session_only',
    error: null
  }

  const input = {
    connection_id: 'local',
    profile: 'work',
    session_id: 'runtime-session',
    model_id: 'fixture',
    expected_account_revision: 7
  }

  const owner = { platform_origin: 'http://127.0.0.1:1234', user_id: '17' }

  const bind = vi.fn().mockResolvedValue({
    ok: true,
    ready: true,
    model_id: 'fixture',
    billing_source: 'aino',
    expires_at: 'fixture-expiry'
  })

  const bridge: PlatformModelsBridge = { owner: async () => owner, bind, clear: async () => {}, list: async () => [] }
  Object.defineProperty(window, 'hermesDesktop', {
    value: { platformModels: bridge },
    writable: true,
    configurable: true
  })
  vi.mocked(requestGatewayForAgent).mockResolvedValue({ managed_model_binding: 1, session_ticket: 'single-use-ticket' })
  expect((await bindPlatformModel(input, account)).ok).toBe(true)
  expect(requestGatewayForAgent).toHaveBeenCalledWith(
    'local',
    'work',
    'session.managed_model_ticket',
    { session_id: 'runtime-session', model_id: 'fixture', owner },
    10_000
  )
  expect(bind).toHaveBeenCalledWith({ ...input, session_ticket: 'single-use-ticket' })
  bind.mockClear()
  expect((await bindPlatformModel({ ...input, expected_account_revision: 6 }, account)).ok).toBe(false)
  vi.mocked(requestGatewayForAgent).mockRejectedValue(new Error('raw remote error'))
  const failed = await bindPlatformModel(input, account)

  expect(failed).toEqual({ ok: false, error: { code: 'gateway_binding_failed' } })
  expect(JSON.stringify(failed)).not.toContain('raw remote error')
  expect(bind).not.toHaveBeenCalled()
})

it('preserves a structured missing-session ticket error for stale-runtime recovery', async () => {
  const account: PlatformAccountSnapshot = {
    revision: 7,
    phase: 'signed_in',
    account: { id: '17', display_name: 'Fixture', email: '', phone_masked: '' },
    mode: 'development',
    remember_state: 'session_only',
    error: null
  }

  const stale = new JsonRpcGatewayError('session not found', {
    code: 4001,
    data: { session_id: 'old-runtime' }
  })

  const bind = vi.fn()

  const bridge: PlatformModelsBridge = {
    owner: async () => ({ platform_origin: 'http://127.0.0.1:1234', user_id: '17' }),
    bind,
    clear: async () => {},
    list: async () => []
  }

  Object.defineProperty(window, 'hermesDesktop', {
    value: { platformModels: bridge },
    writable: true,
    configurable: true
  })
  vi.mocked(requestGatewayForAgent).mockRejectedValue(stale)

  await expect(
    bindPlatformModel(
      {
        connection_id: 'local',
        profile: 'work',
        session_id: 'old-runtime',
        model_id: 'fixture',
        expected_account_revision: 7
      },
      account
    )
  ).rejects.toBe(stale)
  expect(bind).not.toHaveBeenCalled()
})

it.each(['owner', 'bind'] as const)('sanitizes a structured missing-session error from native %s', async stage => {
  const account: PlatformAccountSnapshot = {
    revision: 7,
    phase: 'signed_in',
    account: { id: '17', display_name: 'Fixture', email: '', phone_masked: '' },
    mode: 'development',
    remember_state: 'session_only',
    error: null
  }

  const stale = new JsonRpcGatewayError(`native ${stage} session not found`, {
    code: 4001,
    data: { secret: 'must-not-escape' }
  })

  const bind = vi.fn(async () => {
    if (stage === 'bind') {
      throw stale
    }

    return {
      ok: true as const,
      ready: true as const,
      model_id: 'fixture',
      billing_source: 'aino' as const,
      expires_at: 'later'
    }
  })

  const bridge: PlatformModelsBridge = {
    owner: async () => {
      if (stage === 'owner') {
        throw stale
      }

      return { platform_origin: 'http://127.0.0.1:1234', user_id: '17' }
    },
    bind,
    clear: async () => {},
    list: async () => []
  }

  Object.defineProperty(window, 'hermesDesktop', {
    value: { platformModels: bridge },
    writable: true,
    configurable: true
  })
  vi.mocked(requestGatewayForAgent).mockResolvedValue({
    managed_model_binding: 1,
    session_ticket: 'single-use-ticket'
  })

  const failed = await bindPlatformModel(
    {
      connection_id: 'local',
      profile: 'work',
      session_id: 'runtime-session',
      model_id: 'fixture',
      expected_account_revision: 7
    },
    account
  )

  expect(failed).toEqual({ ok: false, error: { code: 'gateway_binding_failed' } })
  expect(JSON.stringify(failed)).not.toContain('must-not-escape')
})
