import { JsonRpcGatewayError } from '@hermes/shared'
import { atom } from 'nanostores'

import type { RuntimeReadinessRequester } from '@/lib/runtime-readiness'

export interface AccountRecord {
  id: string
  identifier: string
  display_name: string
}

export interface AccountState {
  authenticated: boolean
  account: AccountRecord | null
  mode: 'development' | 'unconfigured'
  canSignIn: boolean
  ready: boolean
  loading: boolean
  error: AccountError | null
}

const ACCOUNT_ERROR_REASONS = [
  'invalid_identifier',
  'missing_code',
  'invalid_code',
  'expired',
  'attempts_exceeded',
  'development_disabled',
  'retry_cooldown',
  'state_unavailable',
  'invalid_display_name',
  'not_authenticated',
  'unavailable'
] as const

export type AccountErrorReason = (typeof ACCOUNT_ERROR_REASONS)[number]

export interface AccountError {
  reason: AccountErrorReason
  retryAfter?: number
}

export interface AccountStatusResponse {
  authenticated: boolean
  account: AccountRecord | null
  mode?: 'development' | 'unconfigured'
  capabilities?: { code_login?: boolean; wechat_login?: boolean }
}

export interface AccountCodeResponse {
  ok: boolean
  delivery: 'development' | string
  expires_in: number
  retry_after: number
}

export interface AccountVerifyResponse extends AccountStatusResponse {
  created?: boolean
}

function accountError(error: unknown): AccountError {
  const data = error instanceof JsonRpcGatewayError ? error.data : null
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const reason = ACCOUNT_ERROR_REASONS.find(value => value === record.reason) ?? 'unavailable'

  return { reason, retryAfter: typeof record.retry_after === 'number' ? record.retry_after : undefined }
}

function statusState(status: AccountStatusResponse): Partial<AccountState> {
  return {
    authenticated: Boolean(status.authenticated && status.account),
    account: status.authenticated ? status.account : null,
    mode: status.mode ?? 'unconfigured',
    canSignIn: status.capabilities?.code_login === true,
    ready: true
  }
}

// The account host owns this cache. Replacing a connection gives it a new atom,
// so late responses cannot publish another connection's account into the UI.
export function createAccountActions(requestGateway: RuntimeReadinessRequester) {
  const state = atom<AccountState>({
    authenticated: false,
    account: null,
    mode: 'unconfigured',
    canSignIn: false,
    ready: false,
    loading: false,
    error: null
  })

  let revision = 0

  const run = async <T>(
    operation: () => Promise<T>,
    apply?: (value: T) => Partial<AccountState>
  ): Promise<T | null> => {
    const current = ++revision
    state.set({ ...state.get(), loading: true, error: null })

    try {
      const result = await operation()

      if (current !== revision) {
        return null
      }

      state.set({ ...state.get(), ...apply?.(result), loading: false, error: null })

      return result
    } catch (error) {
      if (current === revision) {
        state.set({ ...state.get(), loading: false, error: accountError(error) })
      }

      return null
    }
  }

  return {
    state,
    refresh: () => run(() => requestGateway<AccountStatusResponse>('account.status'), statusState),
    requestCode: (identifier: string) =>
      run(() => requestGateway<AccountCodeResponse>('account.request_code', { identifier: identifier.trim() })),
    verifyCode: (identifier: string, code: string) =>
      run(
        () =>
          requestGateway<AccountVerifyResponse>('account.verify_code', {
            identifier: identifier.trim(),
            code: code.trim()
          }),
        statusState
      ),
    updateProfile: (displayName: string) =>
      run(
        () => requestGateway<AccountStatusResponse>('account.update_profile', { display_name: displayName.trim() }),
        statusState
      ),
    logout: () => run(() => requestGateway<AccountStatusResponse>('account.logout'), statusState)
  }
}

export type AccountActions = ReturnType<typeof createAccountActions>
