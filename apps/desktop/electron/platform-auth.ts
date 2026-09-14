import type {
  PhoneVerifyDTO,
  PlatformAccountSnapshot,
  PlatformAuthResult,
  PlatformCaptchaProof,
  PlatformPublicCapabilities
} from '../shared/platform-contract'

import { type PlatformClient, PlatformClientError, type PlatformProfile } from './platform-client'
import type { PlatformTokenSet, PlatformTokenStore } from './platform-token-store'

export interface PlatformAuth {
  initialize(): Promise<PlatformAccountSnapshot>
  snapshot(): PlatformAccountSnapshot
  subscribe(listener: (snapshot: PlatformAccountSnapshot) => void): () => void
  capabilities(): Promise<PlatformPublicCapabilities>
  refresh(): Promise<PlatformAccountSnapshot>
  retry(): Promise<PlatformAccountSnapshot>
  requestPhoneCode(input: {
    phone: string
    captcha_proof?: PlatformCaptchaProof
  }): ReturnType<PlatformClient['requestPhoneCode']>
  verifyPhoneCode(input: PhoneVerifyDTO): Promise<PlatformAuthResult>
  loginExisting(input: {
    email: string
    password: string
    captcha_proof?: PlatformCaptchaProof
    remember: boolean
  }): Promise<PlatformAuthResult>
  completeSecondFactor(input: { totp_code: string }): Promise<PlatformAccountSnapshot>
  updateProfile(input: { display_name: string }): Promise<PlatformAccountSnapshot>
  requestBindingCode(input: {
    phone: string
    captcha_proof?: PlatformCaptchaProof
  }): ReturnType<PlatformClient['requestBindingCode']>
  submitStepUp(input: { totp_code: string }): Promise<PlatformAccountSnapshot>
  bindPhone(input: { phone: string; challenge_id: string; code: string }): Promise<PlatformAccountSnapshot>
  logout(): Promise<PlatformAccountSnapshot>
}

export function createPlatformAuth({
  client,
  tokenStore,
  now
}: {
  client: PlatformClient
  tokenStore: PlatformTokenStore
  now: () => number
}): PlatformAuth {
  let tokens: PlatformTokenSet | null = null
  let pendingSecondFactor: { tempToken: string; remember: boolean } | null = null
  let generation = 0
  let refreshFlight: { generation: number; promise: Promise<PlatformAccountSnapshot> } | null = null
  let persistence = Promise.resolve<unknown>(undefined)

  let current: PlatformAccountSnapshot = {
    revision: 0,
    phase: 'signed_out',
    account: null,
    mode: client.origin === 'https://api.agentera.com.cn' ? 'production' : 'development',
    remember_state: 'session_only',
    error: null
  }

  const listeners = new Set<(snapshot: PlatformAccountSnapshot) => void>()

  function publish(patch: Partial<PlatformAccountSnapshot>) {
    current = { ...current, ...patch, revision: current.revision + 1 }

    for (const listener of listeners) {
      try {
        listener(current)
      } catch {
        // Observers cannot roll back an authoritative account transition.
      }
    }

    return current
  }

  function safeError(error: unknown) {
    return error instanceof PlatformClientError
      ? { code: error.code, ...(error.retryAfter === undefined ? {} : { retry_after: error.retryAfter }) }
      : {
          code:
            typeof (error as { code?: unknown })?.code === 'string'
              ? String((error as { code: string }).code)
              : 'platform_error'
        }
  }

  function requireTokens() {
    if (!tokens) {
      throw new PlatformClientError('authentication_required', true)
    }

    return tokens
  }

  function persist<T>(operation: () => Promise<T>): Promise<T> {
    const result = persistence.then(operation, operation)
    persistence = result.then(
      () => undefined,
      () => undefined
    )

    return result
  }

  async function storeTokens(next: PlatformTokenSet, remember: boolean, expected: number) {
    if (expected !== generation) {
      return false
    }

    const rememberState = remember
      ? await persist(() => tokenStore.save(client.origin, next))
      : await persist(async () => {
          await tokenStore.clear(client.origin)

          return 'session_only' as const
        })

    if (expected !== generation) {
      return false
    }

    return expected === generation ? rememberState : null
  }

  async function finishAuthentication(next: PlatformTokenSet, remember: boolean, expected: number) {
    const profile = await client.profile(next.accessToken)

    if (expected !== generation) {
      throw new PlatformClientError('auth_attempt_superseded')
    }

    const rememberState = await storeTokens(next, remember, expected)

    if (!rememberState || expected !== generation) {
      throw new PlatformClientError('auth_attempt_superseded')
    }

    tokens = next
    pendingSecondFactor = null

    return publish({ phase: 'signed_in', account: profile, remember_state: rememberState, error: null })
  }

  async function finishExchange(
    exchange: Awaited<ReturnType<PlatformClient['login']>>,
    remember: boolean,
    expected: number
  ): Promise<PlatformAuthResult> {
    if (expected !== generation) {
      throw new PlatformClientError('auth_attempt_superseded')
    }

    if (exchange.tempToken) {
      pendingSecondFactor = { tempToken: exchange.tempToken, remember }

      return { status: 'requires_2fa' }
    }

    if (!exchange.tokens) {
      throw new PlatformClientError('invalid_response')
    }

    return { status: 'signed_in', snapshot: await finishAuthentication(exchange.tokens, remember, expected) }
  }

  function operationPhase(error: unknown) {
    if (error instanceof PlatformClientError && error.authentication) {
      return 'reauth_required' as const
    }

    if (error instanceof PlatformClientError && error.code.startsWith('network_')) {
      return 'offline' as const
    }

    return current.phase
  }

  async function performRefresh(expected: number) {
    if (refreshFlight?.generation === expected) {
      return refreshFlight.promise
    }

    const previous = requireTokens()
    const remember = current.remember_state === 'encrypted'

    const promise = (async () =>
      finishAuthentication(await client.refresh(previous.refreshToken), remember, expected))()

    refreshFlight = { generation: expected, promise }

    try {
      return await promise
    } finally {
      if (refreshFlight?.promise === promise) {
        refreshFlight = null
      }
    }
  }

  async function authenticated<T>(operation: (token: string) => Promise<T>, repeatSafe: boolean): Promise<T> {
    const expected = generation

    try {
      try {
        const value = await operation(requireTokens().accessToken)

        if (expected !== generation) {
          throw new PlatformClientError('auth_attempt_superseded')
        }

        return value
      } catch (error) {
        if (!(error instanceof PlatformClientError) || !error.authentication || expected !== generation) {
          throw error
        }

        await performRefresh(expected)

        if (!repeatSafe) {
          throw new PlatformClientError('authentication_refreshed_retry_required')
        }

        const value = await operation(requireTokens().accessToken)

        if (expected !== generation) {
          throw new PlatformClientError('auth_attempt_superseded')
        }

        return value
      }
    } catch (error) {
      if (expected === generation) {
        publish({ phase: operationPhase(error), error: safeError(error) })
      }

      throw error
    }
  }

  async function withAccountProfile(operation: (token: string) => Promise<PlatformProfile>, repeatSafe: boolean) {
    const profile = await authenticated(operation, repeatSafe)

    return publish({ phase: 'signed_in', account: profile, error: null })
  }

  function beginAuthentication() {
    const previous = tokens && current.account ? current : null
    const expected = ++generation
    pendingSecondFactor = null

    if (previous) {
      publish({ error: null })
    } else {
      publish({ phase: 'loading', account: null, error: null })
    }

    return { expected, previous }
  }

  function failAuthentication(error: unknown, expected: number, previous: PlatformAccountSnapshot | null) {
    if (expected !== generation) {
      return
    }

    if (previous) {
      publish({
        phase: previous.phase,
        account: previous.account,
        remember_state: previous.remember_state,
        error: safeError(error)
      })
    } else {
      publish({ phase: 'signed_out', account: null, error: safeError(error) })
    }
  }

  const api: PlatformAuth = {
    async initialize() {
      const expected = ++generation
      publish({ phase: 'loading', error: null })

      try {
        const restored = await tokenStore.load(client.origin)

        if (expected !== generation) {
          return current
        }

        if (!restored) {
          return publish({ phase: 'signed_out', account: null, remember_state: 'session_only', error: null })
        }

        tokens = restored
        current = { ...current, remember_state: 'encrypted' }

        if (restored.expiresAt <= now() + 30_000) {
          return api.refresh()
        }

        const profile = await client.profile(restored.accessToken)

        return expected === generation ? publish({ phase: 'signed_in', account: profile, error: null }) : current
      } catch (error) {
        if (expected !== generation) {
          return current
        }

        if (error instanceof PlatformClientError && error.authentication && tokens?.refreshToken) {
          return api.refresh()
        }

        return publish({ phase: tokens ? 'offline' : 'signed_out', error: safeError(error) })
      }
    },
    snapshot: () => current,
    subscribe(listener) {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    capabilities: () => client.capabilities(),
    refresh() {
      const expected = generation

      return (async () => {
        try {
          return await performRefresh(expected)
        } catch (error) {
          if (expected === generation) {
            publish({
              phase: error instanceof PlatformClientError && error.authentication ? 'reauth_required' : 'offline',
              error: safeError(error)
            })
          }

          return current
        }
      })()
    },
    async retry() {
      if (!tokens) {
        return api.initialize()
      }

      const profile = await authenticated(token => client.profile(token), true)

      return publish({ phase: 'signed_in', account: profile, error: null })
    },
    requestPhoneCode: input => client.requestPhoneCode(input),
    async verifyPhoneCode(input) {
      const { expected, previous } = beginAuthentication()

      try {
        return await finishExchange(await client.verifyPhone(input), input.remember, expected)
      } catch (error) {
        failAuthentication(error, expected, previous)

        throw error
      } finally {
        input.code = ''
      }
    },
    async loginExisting(input) {
      const { expected, previous } = beginAuthentication()

      try {
        return await finishExchange(await client.login(input), input.remember, expected)
      } catch (error) {
        failAuthentication(error, expected, previous)

        throw error
      } finally {
        input.password = ''
      }
    },
    async completeSecondFactor(input) {
      const pending = pendingSecondFactor

      if (!pending) {
        throw new PlatformClientError('second_factor_not_pending')
      }

      const expected = generation

      try {
        return await finishAuthentication(
          await client.complete2FA({ temp_token: pending.tempToken, totp_code: input.totp_code }),
          pending.remember,
          expected
        )
      } finally {
        input.totp_code = ''
      }
    },
    async updateProfile(input) {
      const name = input.display_name.trim()

      if (name.length < 1 || name.length > 32) {
        throw new PlatformClientError('invalid_display_name')
      }

      return withAccountProfile(token => client.updateProfile(token, name), true)
    },
    requestBindingCode(input) {
      return authenticated(
        token => client.requestBindingCode(token, input.phone, input.captcha_proof),
        false
      )
    },
    async submitStepUp(input) {
      try {
        await authenticated(token => client.submitStepUp(token, input.totp_code), false)

        return current
      } finally {
        input.totp_code = ''
      }
    },
    bindPhone(input) {
      return withAccountProfile(token => client.bindPhone(token, input), false)
    },
    async logout() {
      const previous = tokens
      const previousSnapshot = current
      generation += 1
      pendingSecondFactor = null
      refreshFlight = null

      const [local, remote] = await Promise.allSettled([
        persist(() => tokenStore.clear(client.origin)),
        previous?.refreshToken ? client.logout(previous.refreshToken) : Promise.resolve()
      ])

      if (local.status === 'rejected') {
        tokens = previous
        publish({
          phase: previousSnapshot.phase,
          account: previousSnapshot.account,
          remember_state: previousSnapshot.remember_state,
          error: safeError(local.reason)
        })
        throw local.reason
      }

      tokens = null

      return publish({
        phase: 'signed_out',
        account: null,
        remember_state: 'session_only',
        error: remote.status === 'rejected' ? { code: 'logout_revocation_unconfirmed' } : null
      })
    }
  }

  return api
}
