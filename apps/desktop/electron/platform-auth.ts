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
  let refreshFlight: Promise<PlatformAccountSnapshot> | null = null
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
      listener(current)
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

    tokens = next
    current = { ...current, remember_state: rememberState }

    return true
  }

  async function finishAuthentication(next: PlatformTokenSet, remember: boolean, expected: number) {
    if (!(await storeTokens(next, remember, expected))) {
      return current
    }

    const profile = await client.profile(next.accessToken)

    if (expected !== generation) {
      return current
    }

    pendingSecondFactor = null

    return publish({ phase: 'signed_in', account: profile, error: null })
  }

  async function finishExchange(
    exchange: Awaited<ReturnType<PlatformClient['login']>>,
    remember: boolean,
    expected: number
  ): Promise<PlatformAuthResult> {
    if (exchange.tempToken) {
      if (expected === generation) {
        pendingSecondFactor = { tempToken: exchange.tempToken, remember }
      }

      return { status: 'requires_2fa' }
    }

    if (!exchange.tokens) {
      throw new PlatformClientError('invalid_response')
    }

    return { status: 'signed_in', snapshot: await finishAuthentication(exchange.tokens, remember, expected) }
  }

  async function withAccountProfile(operation: (token: string) => Promise<PlatformProfile>) {
    const expected = generation

    try {
      const profile = await operation(requireTokens().accessToken)

      return expected === generation ? publish({ phase: 'signed_in', account: profile, error: null }) : current
    } catch (error) {
      if (expected === generation) {
        publish({
          phase: error instanceof PlatformClientError && error.authentication ? 'reauth_required' : 'offline',
          error: safeError(error)
        })
      }

      throw error
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
      if (refreshFlight) {
        return refreshFlight
      }

      const expected = generation
      const previous = requireTokens()
      const remember = current.remember_state === 'encrypted'
      refreshFlight = (async () => {
        try {
          return await finishAuthentication(await client.refresh(previous.refreshToken), remember, expected)
        } catch (error) {
          if (expected === generation) {
            publish({
              phase: error instanceof PlatformClientError && error.authentication ? 'reauth_required' : 'offline',
              error: safeError(error)
            })
          }

          return current
        } finally {
          refreshFlight = null
        }
      })()

      return refreshFlight
    },
    requestPhoneCode: input => client.requestPhoneCode(input),
    async verifyPhoneCode(input) {
      const expected = ++generation
      publish({ phase: 'loading', account: null, error: null })

      try {
        return await finishExchange(await client.verifyPhone(input), input.remember, expected)
      } catch (error) {
        if (expected === generation) {
          publish({ phase: 'signed_out', error: safeError(error) })
        }

        throw error
      } finally {
        input.code = ''
      }
    },
    async loginExisting(input) {
      const expected = ++generation
      publish({ phase: 'loading', account: null, error: null })

      try {
        return await finishExchange(await client.login(input), input.remember, expected)
      } catch (error) {
        if (expected === generation) {
          publish({ phase: 'signed_out', error: safeError(error) })
        }

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

      try {
        return await finishAuthentication(
          await client.complete2FA({ temp_token: pending.tempToken, totp_code: input.totp_code }),
          pending.remember,
          generation
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

      return withAccountProfile(token => client.updateProfile(token, name))
    },
    requestBindingCode(input) {
      return client.requestBindingCode(requireTokens().accessToken, input.phone, input.captcha_proof)
    },
    async submitStepUp(input) {
      try {
        await client.submitStepUp(requireTokens().accessToken, input.totp_code)

        return current
      } finally {
        input.totp_code = ''
      }
    },
    bindPhone(input) {
      return withAccountProfile(token => client.bindPhone(token, input))
    },
    async logout() {
      const previous = tokens
      generation += 1
      tokens = null
      pendingSecondFactor = null
      refreshFlight = null
      publish({ phase: 'signed_out', account: null, remember_state: 'session_only', error: null })

      try {
        await persist(() => tokenStore.clear(client.origin))
      } catch (error) {
        publish({ error: safeError(error) })
        throw error
      }

      if (previous?.refreshToken) {
        void client.logout(previous.refreshToken).catch(() => {
          /* local logout remains authoritative */
        })
      }

      return current
    }
  }

  return api
}
