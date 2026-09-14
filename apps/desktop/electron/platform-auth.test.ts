import http from 'node:http'

import { afterEach, describe, expect, it } from 'vitest'

import { createPlatformAuth } from './platform-auth'
import { createPlatformClient } from './platform-client'
import type { PlatformTokenSet, PlatformTokenStore } from './platform-token-store'

const servers: http.Server[] = []
afterEach(async () => Promise.all(servers.splice(0).map(s => new Promise<void>(r => s.close(() => r())))))

async function createPlatformAuthTestRig(options: { delaySave?: boolean } = {}) {
  let pendingProfile: (() => void) | null = null
  let signalPendingProfile: (() => void) | null = null

  const pendingProfileReady = new Promise<void>(resolve => {
    signalPendingProfile = resolve
  })

  let refreshCalls = 0
  let profileCalls = 0

  const server = http.createServer((req, res) => {
    const json = (data: unknown, status = 200) => {
      res.statusCode = status
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(data))
    }

    if (req.url === '/api/v1/auth/refresh') {
      refreshCalls += 1
      json({
        code: 0,
        message: 'ok',
        data: {
          access_token: 'rotated-access',
          refresh_token: 'rotated-refresh',
          expires_in: 3600,
          token_type: 'Bearer'
        }
      })
    } else if (req.url === '/api/v1/user/profile') {
      profileCalls += 1

      const reply = () =>
        json({
          code: 0,
          message: 'ok',
          data: {
            id: 17,
            username: 'old account',
            email: '',
            phone_bound: true,
            auth_bindings: { phone: { subject_hint: '139****0000' } }
          }
        })

      if (profileCalls === 1) {
        reply()
      } else {
        pendingProfile = reply
        signalPendingProfile?.()
      }
    } else if (req.url === '/api/v1/auth/logout') {
      json({ code: 0, message: 'ok', data: { success: true } })
    } else {
      json({ code: 'NOT_FOUND', message: 'not found' }, 404)
    }
  })

  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }

  let persisted: PlatformTokenSet | null = {
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    expiresAt: 999_999
  }

  let releaseSave: (() => void) | null = null
  let signalSaveStarted: (() => void) | null = null

  const saveStarted = new Promise<void>(resolve => {
    signalSaveStarted = resolve
  })

  const saveGate = new Promise<void>(resolve => {
    releaseSave = resolve
  })

  const tokenStore: PlatformTokenStore = {
    load: async () => persisted,
    save: async (_origin, tokens) => {
      if (options.delaySave) {
        signalSaveStarted?.()
        await saveGate
      }

      persisted = tokens

      return 'encrypted'
    },
    clear: async () => {
      persisted = null
    }
  }

  const auth = createPlatformAuth({
    client: createPlatformClient({ origin: `http://127.0.0.1:${address.port}`, allowInsecureLoopback: true }),
    tokenStore,
    now: () => 10_000
  })

  await auth.initialize()

  return {
    auth,
    get refreshCalls() {
      return refreshCalls
    },
    waitForPendingProfile: () => pendingProfileReady,
    resolvePendingProfile: () => pendingProfile?.(),
    waitForSave: () => saveStarted,
    releaseSave: () => releaseSave?.(),
    get persisted() {
      return persisted
    }
  }
}

describe('platform auth ownership', () => {
  it('single-flights refresh and persists the rotated token family', async () => {
    const f = await createPlatformAuthTestRig()
    const one = f.auth.refresh()
    const two = f.auth.refresh()
    await f.waitForPendingProfile()
    f.resolvePendingProfile()
    await Promise.all([one, two])
    expect(f.refreshCalls).toBe(1)
    expect(f.persisted).toMatchObject({ accessToken: 'rotated-access', refreshToken: 'rotated-refresh' })
  })

  it('does not restore a logged-out account from a late response', async () => {
    const f = await createPlatformAuthTestRig()
    const pending = f.auth.refresh()
    await f.waitForPendingProfile()
    await f.auth.logout()
    f.resolvePendingProfile()
    await pending
    expect(f.auth.snapshot().phase).toBe('signed_out')
    expect(f.persisted).toBeNull()
  })

  it('clears a remembered token write that finishes after logout', async () => {
    const f = await createPlatformAuthTestRig({ delaySave: true })
    const pending = f.auth.refresh()
    await f.waitForSave()
    const logout = f.auth.logout()
    f.releaseSave()
    await Promise.all([pending, logout])
    expect(f.persisted).toBeNull()
  })

  it('keeps the last account while offline but requires reauthentication on a confirmed 401', async () => {
    const origin = await serveSequence([
      [200, { code: 0, data: { id: 2, username: 'Lin', email: 'lin@example.test' } }],
      [503, { code: 'UPSTREAM', message: 'down' }],
      [401, { code: 'TOKEN_INVALID', message: 'revoked' }]
    ])

    const tokens = { accessToken: 'access', refreshToken: 'refresh', expiresAt: 999_999 }
    const store: PlatformTokenStore = { load: async () => tokens, save: async () => 'encrypted', clear: async () => {} }

    const auth = createPlatformAuth({
      client: createPlatformClient({ origin, allowInsecureLoopback: true }),
      tokenStore: store,
      now: () => 1
    })

    await auth.initialize()
    expect(auth.snapshot().phase).toBe('signed_in')
    await auth.refresh()
    expect(auth.snapshot()).toMatchObject({ phase: 'offline', account: { id: '2' } })
    await auth.refresh()
    expect(auth.snapshot()).toMatchObject({ phase: 'reauth_required', account: { id: '2' } })
  })
})

async function serveSequence(responses: Array<[number, unknown]>) {
  const server = http.createServer((_req, res) => {
    const [status, body] = responses.shift() ?? [500, {}]
    res.statusCode = status
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(body))
  })

  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))

  return `http://127.0.0.1:${(server.address() as { port: number }).port}`
}
