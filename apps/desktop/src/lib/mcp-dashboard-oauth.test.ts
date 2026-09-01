import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setRuntimeI18nLocale } from '@/i18n'

import { completeMcpDesktopOAuth, McpOAuthCancelled, type McpOAuthFlow } from './mcp-dashboard-oauth'

const flow = (overrides: Partial<McpOAuthFlow> = {}): McpOAuthFlow => ({
  authorization_url: 'https://example.com/authorize',
  error: null,
  flow_id: 'flow-1',
  server_name: 'demo',
  status: 'authorization_required',
  ...overrides
})

describe('completeMcpDesktopOAuth fallback errors', () => {
  beforeEach(() => {
    setRuntimeI18nLocale('zh')
  })

  afterEach(() => {
    setRuntimeI18nLocale('en')
  })

  it('opens the returned authorization URL and polls through approval', async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined)

    const status = vi
      .fn()
      .mockResolvedValueOnce(
        flow({
          server_name: 'reports'
        })
      )
      .mockResolvedValueOnce(
        flow({
          server_name: 'reports',
          status: 'approved',
          tools: [{ name: 'list_reports', description: 'List reports' }]
        })
      )

    const result = await completeMcpDesktopOAuth({
      serverName: 'reports',
      start: vi.fn().mockResolvedValue(flow({ server_name: 'reports' })),
      status,
      openExternal,
      sleep: async () => {}
    })

    expect(openExternal).toHaveBeenCalledWith('https://example.com/authorize')
    expect(result.status).toBe('approved')
  })

  it('retries a transient status failure', async () => {
    const status = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce(flow({ status: 'approved', tools: [] }))

    const result = await completeMcpDesktopOAuth({
      serverName: 'reports',
      start: vi.fn().mockResolvedValue(flow()),
      status,
      openExternal: vi.fn().mockResolvedValue(undefined),
      sleep: async () => {}
    })

    expect(result.status).toBe('approved')
    expect(status).toHaveBeenCalledTimes(2)
  })

  it('localizes an OAuth start failure without a backend message', async () => {
    await expect(
      completeMcpDesktopOAuth({
        openExternal: vi.fn(async () => undefined),
        serverName: 'demo',
        start: vi.fn(async () => flow({ authorization_url: null, status: 'error' })),
        status: vi.fn(async () => flow()),
        sleep: vi.fn(async () => undefined)
      })
    ).rejects.toThrow('OAuth 启动失败')
  })

  it('localizes a missing OAuth authorization URL', async () => {
    await expect(
      completeMcpDesktopOAuth({
        openExternal: vi.fn(async () => undefined),
        serverName: 'demo',
        start: vi.fn(async () => flow({ authorization_url: null, status: 'starting' })),
        status: vi.fn(async () => flow()),
        sleep: vi.fn(async () => undefined)
      })
    ).rejects.toThrow('OAuth 服务器未提供授权地址')
  })

  it('localizes an OAuth authorization failure without a backend message', async () => {
    await expect(
      completeMcpDesktopOAuth({
        openExternal: vi.fn(async () => undefined),
        serverName: 'demo',
        start: vi.fn(async () => flow()),
        status: vi.fn(async () => flow({ error: null, status: 'error' })),
        sleep: vi.fn(async () => undefined)
      })
    ).rejects.toThrow('OAuth 授权失败')
  })

  it('localizes a deliberate OAuth cancellation', async () => {
    const cancel = vi.fn(async () => undefined)

    await expect(
      completeMcpDesktopOAuth({
        cancel,
        cancelled: () => true,
        openExternal: vi.fn(async () => undefined),
        serverName: 'demo',
        start: vi.fn(async () => flow()),
        status: vi.fn(async () => flow()),
        sleep: vi.fn(async () => undefined)
      })
    ).rejects.toBeInstanceOf(McpOAuthCancelled)

    await expect(
      completeMcpDesktopOAuth({
        cancel,
        cancelled: () => true,
        openExternal: vi.fn(async () => undefined),
        serverName: 'demo',
        start: vi.fn(async () => flow()),
        status: vi.fn(async () => flow()),
        sleep: vi.fn(async () => undefined)
      })
    ).rejects.toThrow('OAuth 已由用户取消')
  })
})
