import http from 'node:http'

import { afterEach, describe, expect, it } from 'vitest'

import { createPlatformClient, resolvePlatformOrigin } from './platform-client'

const servers: http.Server[] = []

async function serve(handler: http.RequestListener) {
  const server = http.createServer(handler)
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()

  if (!address || typeof address === 'string') {
    throw new Error('fixture did not bind')
  }

  return `http://127.0.0.1:${address.port}`
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))))
})

describe('platform client', () => {
  it('uses only unpackaged loopback development config and ignores it when packaged', () => {
    const read = () => JSON.stringify({ enabled: true, origin: 'http://127.0.0.1:8080' })
    expect(resolvePlatformOrigin({ isPackaged: false, readDevelopmentConfig: read })).toEqual({
      origin: 'http://127.0.0.1:8080',
      development: true
    })
    expect(resolvePlatformOrigin({ isPackaged: true, readDevelopmentConfig: read })).toEqual({
      origin: 'https://api.agentera.com.cn',
      development: false
    })
    expect(() =>
      resolvePlatformOrigin({
        isPackaged: false,
        readDevelopmentConfig: () => JSON.stringify({ enabled: true, origin: 'http://example.com' })
      })
    ).toThrow('invalid_platform_origin')
  })
  it('parses the API envelope and validates profile fields', async () => {
    const origin = await serve((req, res) => {
      expect(req.url).toBe('/api/v1/user/profile')
      expect(req.headers.authorization).toBe('Bearer access')
      res.setHeader('content-type', 'application/json')
      res.end(
        JSON.stringify({
          code: 0,
          message: 'ok',
          data: {
            id: 17,
            username: 'Ada',
            email: 'ada@example.test',
            phone_bound: true,
            auth_bindings: { phone: { subject_hint: '+86 139****0000' } }
          }
        })
      )
    })

    const client = createPlatformClient({ origin, allowInsecureLoopback: true })
    await expect(client.profile('access')).resolves.toMatchObject({
      id: '17',
      display_name: 'Ada',
      phone_masked: '+86 139****0000'
    })
  })

  it('fails closed when public settings enable conflicting captcha providers', async () => {
    const origin = await serve((_req, res) => {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({
        code: 0,
        message: 'ok',
        data: {
          desktop_api_version: 1,
          registration_enabled: true,
          phone_login_enabled: true,
          phone_registration_enabled: true,
          phone_binding_enabled: true,
          phone_regions: ['+86'],
          phone_code_length: 6,
          turnstile_enabled: true,
          turnstile_site_key: 'turnstile',
          tencent_captcha_enabled: true,
          tencent_captcha_app_id: 'tencent'
        }
      }))
    })

    await expect(createPlatformClient({ origin, allowInsecureLoopback: true }).capabilities()).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })

  it('rejects an authenticated cross-origin redirect without forwarding the token', async () => {
    let leaked: string | undefined

    const target = await serve((req, res) => {
      leaked = req.headers.authorization
      res.end('{}')
    })

    const origin = await serve((_req, res) => {
      res.statusCode = 302
      res.setHeader('location', `${target}/steal`)
      res.end()
    })

    const client = createPlatformClient({ origin, allowInsecureLoopback: true })

    await expect(client.profile('access-secret')).rejects.toMatchObject({ code: 'redirect_rejected' })
    expect(leaked).toBeUndefined()
  })

  it('maps timeout and explicit 401 to distinct safe errors', async () => {
    const slow = await serve((_req, _res) => {})
    await expect(
      createPlatformClient({ origin: slow, allowInsecureLoopback: true, timeoutMs: 15 }).profile('access')
    ).rejects.toMatchObject({ code: 'network_timeout', authentication: false })

    const denied = await serve((_req, res) => {
      res.statusCode = 401
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ code: 'TOKEN_INVALID', message: 'raw server detail' }))
    })

    await expect(
      createPlatformClient({ origin: denied, allowInsecureLoopback: true }).profile('access')
    ).rejects.toMatchObject({ code: 'TOKEN_INVALID', authentication: true })
  })

  it('keeps the timeout active while a response body is stalled', async () => {
    const origin = await serve((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write('{"code":0,"message":"ok","data":')
    })

    await expect(
      createPlatformClient({ origin, allowInsecureLoopback: true, timeoutMs: 15 }).profile('access')
    ).rejects.toMatchObject({ code: 'network_timeout' })
  })

  it('requires the code/message/data response envelope', async () => {
    const origin = await serve((_req, res) => {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ id: 17, username: 'unwrapped', email: '' }))
    })

    await expect(createPlatformClient({ origin, allowInsecureLoopback: true }).profile('access')).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })

  it.each([
    [{ access_token: 'access', refresh_token: 'refresh', expires_in: 0, token_type: 'Bearer' }, 'zero expiry'],
    [{ access_token: 'access', refresh_token: 'refresh', expires_in: 3600, token_type: 'Basic' }, 'non-Bearer type']
  ])('rejects malformed token pairs: %s (%s)', async (data) => {
    const origin = await serve((_req, res) => {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ code: 0, message: 'success', data }))
    })

    await expect(createPlatformClient({ origin, allowInsecureLoopback: true }).refresh('refresh')).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })

  it('does not classify business 403 as token authentication failure or invent retry_after', async () => {
    const origin = await serve((_req, res) => {
      res.statusCode = 403
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ code: 403, message: 'Recent authentication required', reason: 'RECENT_AUTH_REQUIRED' }))
    })

    await expect(createPlatformClient({ origin, allowInsecureLoopback: true }).profile('access')).rejects.toMatchObject({
      code: 'RECENT_AUTH_REQUIRED',
      authentication: false,
      retryAfter: undefined
    })
  })

  it('maps API rate-limit metadata into finite safe error fields', async () => {
    const origin = await serve((_req, res) => {
      res.statusCode = 429
      res.setHeader('retry-after', '47')
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ code: 429, message: 'raw cooldown detail', reason: 'SMS_RATE_LIMITED' }))
    })

    await expect(
      createPlatformClient({ origin, allowInsecureLoopback: true }).requestPhoneCode({ phone: '13900000000' })
    ).rejects.toMatchObject({ code: 'SMS_RATE_LIMITED', retryAfter: 47, authentication: false })
  })
})
