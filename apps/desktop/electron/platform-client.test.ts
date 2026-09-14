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
})
