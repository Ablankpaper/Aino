import { describe, it, expect, beforeEach } from 'vitest'
import http from 'node:http'

import type { BindPlatformModelInput, BindPlatformModelResult, PlatformModel } from '../shared/platform-contract'
import { createPlatformRuntimeBindingController } from './platform-runtime-binding'
import type { PlatformAuth } from './platform-auth'

// Stub types for the test
interface TestLease {
  api_key: string
  base_url: string
  expires_at: string
  credential_id: string
  model: PlatformModel
}

interface TestGateway {
  lastTarget(): { connectionId: string; profile: string; sessionId: string }
  lastBinding(): { api_key: string }
}

interface PlatformBindingRig {
  allowedInput: BindPlatformModelInput
  expectedResolvedTarget: { connectionId: string; profile: string; sessionId: string }
  testLease: TestLease
  gateway: TestGateway
  bind(input: BindPlatformModelInput): Promise<BindPlatformModelResult>
  rendererEvents(): unknown[]
}

function createPlatformBindingRig(): PlatformBindingRig {
  const testLease: TestLease = {
    credential_id: 'cred_123',
    api_key: 'sk-secret-test-key',
    base_url: 'https://api.example.com',
    expires_at: '2026-12-31T23:59:59Z',
    model: {
      id: 'model-1',
      display_name: 'Test Model',
      provider_label: 'Test Provider'
    }
  }

  const allowedInput: BindPlatformModelInput = {
    connection_id: 'conn_test',
    profile: 'default',
    session_id: 'sess_allowed',
    model_id: 'model-1',
    expected_account_revision: 1
  }

  const expectedResolvedTarget = {
    connectionId: 'conn_test',
    profile: 'default',
    sessionId: 'sess_allowed'
  }

  let lastRpcCall: { wsUrl: string; method: string; params: any } | null = null
  const rendererEventLog: unknown[] = []

  const mockAuth: PlatformAuth = {
    initialize: async () => ({
      revision: 1,
      phase: 'signed_in',
      account: { id: 'user_123', display_name: 'Test User', phone_masked: '', email: '' },
      mode: 'development',
      remember_state: 'session_only',
      error: null
    }),
    generation: () => 1,
    snapshot: () => ({
      revision: 1,
      phase: 'signed_in',
      account: { id: 'user_123', display_name: 'Test User', phone_masked: '', email: '' },
      mode: 'development',
      remember_state: 'session_only',
      error: null
    }),
    subscribe: () => () => {},
    capabilities: async () => ({} as any),
    refresh: async () => ({
      revision: 1,
      phase: 'signed_in',
      account: { id: 'user_123', display_name: 'Test User', phone_masked: '', email: '', accessToken: 'access_token_test' } as any,
      mode: 'development',
      remember_state: 'session_only',
      error: null
    }),
    retry: async () => ({} as any),
    requestPhoneCode: async () => ({} as any),
    verifyPhoneCode: async () => ({} as any),
    loginExisting: async () => ({} as any),
    completeSecondFactor: async () => ({} as any),
    updateProfile: async () => ({} as any),
    requestBindingCode: async () => ({} as any),
    submitStepUp: async () => ({} as any),
    bindPhone: async () => ({} as any),
    logout: async () => ({} as any)
  }

  const mockClient = {
    origin: 'https://api.test.com',
    capabilities: async () => ({} as any),
    profile: async () => ({} as any),
    refresh: async () => ({} as any),
    requestPhoneCode: async () => ({} as any),
    verifyPhone: async () => ({} as any),
    login: async () => ({} as any),
    complete2FA: async () => ({} as any),
    updateProfile: async () => ({} as any),
    requestBindingCode: async () => ({} as any),
    bindPhone: async () => ({} as any),
    submitStepUp: async () => {},
    logout: async () => {},
    models: async () => [testLease.model],
    modelLease: async (_token: string, _modelId: string) => ({
      credential_id: testLease.credential_id,
      api_key: testLease.api_key,
      base_url: testLease.base_url,
      expires_at: testLease.expires_at,
      model: testLease.model,
      api_mode: 'openai',
      capabilities: {}
    })
  }

  const controller = createPlatformRuntimeBindingController({
    auth: mockAuth,
    client: mockClient,
    resolveConnection: async (connectionId, profile) => {
      if (connectionId === allowedInput.connection_id && profile === allowedInput.profile) {
        return { ws_url: 'ws://localhost:9999/gateway' }
      }
      return null
    },
    sendGatewayRpc: async (wsUrl, method, params) => {
      lastRpcCall = { wsUrl, method, params }
      const p = params as any
      if (p.session_id !== allowedInput.session_id) {
        throw new Error('Session mismatch')
      }
    }
  })

  const gateway: TestGateway = {
    lastTarget: () => {
      if (!lastRpcCall) throw new Error('No RPC call made')
      const params = lastRpcCall.params as any
      return {
        connectionId: allowedInput.connection_id,
        profile: allowedInput.profile,
        sessionId: params.session_id
      }
    },
    lastBinding: () => {
      if (!lastRpcCall) throw new Error('No RPC call made')
      return { api_key: (lastRpcCall.params as any).api_key }
    }
  }

  return {
    allowedInput,
    expectedResolvedTarget,
    testLease,
    gateway,
    bind: input => controller.bind(input),
    rendererEvents: () => rendererEventLog
  }
}

describe('platform-runtime-binding', () => {
  it('binds credentials to the resolved owner without returning them to the renderer', async () => {
    const f = createPlatformBindingRig()
    const result = await f.bind(f.allowedInput)

    expect(f.gateway.lastTarget()).toEqual(f.expectedResolvedTarget)
    expect(f.gateway.lastBinding().api_key).toBe(f.testLease.api_key)
    expect(JSON.stringify(result)).not.toContain(f.testLease.api_key)
    expect(f.rendererEvents()).not.toContainEqual(expect.objectContaining({ api_key: expect.anything() }))
  })

  it('rejects binding to wrong session', async () => {
    const f = createPlatformBindingRig()
    const wrongInput = { ...f.allowedInput, session_id: 'wrong-session-id' }

    const result = await f.bind(wrongInput)
    expect(result.ok).toBe(false)
    expect((result as Extract<BindPlatformModelResult, { ok: false }>).error.code).toBeDefined()
  })

  it('rejects binding with stale account revision', async () => {
    const f = createPlatformBindingRig()
    const staleInput = { ...f.allowedInput, expected_account_revision: f.allowedInput.expected_account_revision - 1 }

    const result = await f.bind(staleInput)
    expect(result.ok).toBe(false)
    expect((result as Extract<BindPlatformModelResult, { ok: false }>).error.code).toBe('stale_account_revision')
  })
})
