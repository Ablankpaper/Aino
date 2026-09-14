import { describe, expect, it, vi } from 'vitest'

import { createPlatformCaptcha, createPlatformCaptchaBroker } from './platform-captcha'

const disabled = { captcha: { provider: 'disabled', site_key: '', scene_id: '', prefix: '', region: '' } }

describe('platform captcha broker', () => {
  it('binds a nonce to one window, main frame, origin, operation generation and one submission', async () => {
    let generation = 3
    const capabilities = vi.fn().mockResolvedValue(disabled)

    const broker = createPlatformCaptchaBroker({
      capabilities: capabilities as any,
      generation: () => generation,
      randomNonce: () => 'nonce-1'
    })

    const window = {}
    const pending = broker.begin(window, 'https://api.agentera.com.cn/desktop/captcha')
    expect(
      broker.getChallenge({ window, mainFrame: true, url: 'https://api.agentera.com.cn/desktop/captcha' })
    ).toEqual({ nonce: 'nonce-1' })
    await broker.submit({
      window,
      mainFrame: true,
      url: 'https://api.agentera.com.cn/desktop/captcha',
      nonce: 'nonce-1',
      proof: {}
    })
    await expect(pending).resolves.toEqual({})
    await expect(
      broker.submit({
        window,
        mainFrame: true,
        url: 'https://api.agentera.com.cn/desktop/captcha',
        nonce: 'nonce-1',
        proof: {}
      })
    ).rejects.toThrow('captcha_consumed')

    const staleWindow = {}
    const stale = broker.begin(staleWindow, 'https://api.agentera.com.cn/desktop/captcha')
    generation = 4
    await expect(
      broker.submit({
        window: staleWindow,
        mainFrame: true,
        url: 'https://api.agentera.com.cn/desktop/captcha',
        nonce: 'nonce-1',
        proof: {}
      })
    ).rejects.toThrow('captcha_stale')
    await expect(stale).rejects.toThrow('captcha_stale')
  })

  it('requires the fresh provider proof shape and rejects unknown or oversized fields', async () => {
    const capabilities = vi
      .fn()
      .mockResolvedValue({ captcha: { provider: 'tencent', site_key: 'app', scene_id: '', prefix: '', region: 'cn' } })

    const broker = createPlatformCaptchaBroker({
      capabilities: capabilities as any,
      generation: () => 1,
      randomNonce: () => 'nonce'
    })

    const window = {}
    const url = 'https://api.agentera.com.cn/desktop/captcha'
    void broker.begin(window, url)
    await expect(broker.submit({ window, mainFrame: true, url, nonce: 'nonce', proof: {} })).rejects.toThrow(
      'captcha_proof_required'
    )
    await expect(
      broker.submit({ window, mainFrame: true, url, nonce: 'nonce', proof: { unknown: 'x' } as any })
    ).rejects.toThrow('captcha_proof_invalid')
    await expect(
      broker.submit({
        window,
        mainFrame: true,
        url,
        nonce: 'nonce',
        proof: { tencent_captcha_ticket: 'x'.repeat(4097), tencent_captcha_randstr: 'r' }
      })
    ).rejects.toThrow('captcha_proof_invalid')
  })

  it('rejects a proof when the public captcha policy changes after the operation began', async () => {
    let siteKey = 'key-1'

    const capabilities = async () =>
      ({ ...disabled, captcha: { ...disabled.captcha, provider: 'turnstile' as const, site_key: siteKey } }) as any

    const broker = createPlatformCaptchaBroker({ capabilities, generation: () => 1, randomNonce: () => 'nonce' })
    const window = {}
    const pending = broker.begin(window, 'https://api.agentera.com.cn/desktop/captcha')
    await Promise.resolve()
    siteKey = 'key-2'
    await expect(
      broker.submit({
        window,
        mainFrame: true,
        url: 'https://api.agentera.com.cn/desktop/captcha',
        nonce: 'nonce',
        proof: { turnstile_token: 'proof' }
      })
    ).rejects.toThrow('captcha_stale_policy')
    await expect(pending).rejects.toThrow('captcha_stale_policy')
  })

  it('rejects auxiliary frames and lookalike origins', () => {
    const broker = createPlatformCaptchaBroker({
      capabilities: async () => disabled as any,
      generation: () => 1,
      randomNonce: () => 'nonce'
    })

    const window = {}
    void broker.begin(window, 'https://api.agentera.com.cn/desktop/captcha')
    expect(() =>
      broker.getChallenge({ window, mainFrame: false, url: 'https://api.agentera.com.cn/desktop/captcha' })
    ).toThrow('captcha_sender_rejected')
    expect(() =>
      broker.getChallenge({ window, mainFrame: true, url: 'https://api.agentera.com.cn.evil.test/desktop/captcha' })
    ).toThrow('captcha_sender_rejected')
  })

  it('creates a minimal isolated window and accepts IPC only from its main document', async () => {
    const handlers = new Map<string, (...args: any[]) => any>()
    const ipc = { handle: (channel: string, handler: (...args: any[]) => any) => handlers.set(channel, handler) }
    const events = new Map<string, (...args: any[]) => void>()

    const sender: any = {
      mainFrame: { url: 'https://api.agentera.com.cn/desktop/captcha' },
      setWindowOpenHandler: vi.fn()
    }

    const win: any = {
      webContents: sender,
      isDestroyed: () => false,
      close: vi.fn(),
      loadURL: vi.fn().mockResolvedValue(undefined),
      once: (name: string, fn: any) => events.set(name, fn)
    }

    const createWindow = vi.fn().mockReturnValue(win)

    const captcha = createPlatformCaptcha({
      ipc: ipc as any,
      createWindow,
      fromWebContents: (value: unknown) => (value === sender ? win : null),
      origin: 'https://api.agentera.com.cn',
      preloadPath: '/app/platform-captcha-preload.js',
      capabilities: async () => disabled as any,
      generation: () => 1,
      randomNonce: () => 'nonce'
    })

    const pending = captcha.acquire()
    expect(createWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        webPreferences: {
          preload: '/app/platform-captcha-preload.js',
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
          webviewTag: false
        }
      })
    )
    expect(win.loadURL).toHaveBeenCalledWith('https://api.agentera.com.cn/desktop/captcha')
    const event = { sender, senderFrame: sender.mainFrame }
    expect(handlers.get('aino:platform-captcha:get')!(event)).toEqual({ nonce: 'nonce' })
    await handlers.get('aino:platform-captcha:submit')!(event, { nonce: 'nonce', proof: {} })
    await expect(pending).resolves.toEqual({})
    expect(win.close).toHaveBeenCalledOnce()
  })
})
