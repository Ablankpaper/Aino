import { beforeEach, describe, expect, it, vi } from 'vitest'

import { registerPlatformIpc } from './platform-ipc'

function rig() {
  const handlers = new Map<string, (...args: any[]) => any>()

  const ipc = {
    handle: (channel: string, handler: (...args: any[]) => any) => handlers.set(channel, handler),
    removeHandler: vi.fn()
  }

  let changed: ((snapshot: any) => void) | null = null

  const snapshot = {
    revision: 1,
    phase: 'signed_in',
    account: { id: '1', display_name: 'Ada', phone_masked: '', email: '' },
    mode: 'development',
    remember_state: 'session_only',
    error: null
  }

  const auth: any = {
    snapshot: () => snapshot,
    subscribe: (listener: any) => {
      changed = listener

      return () => {
        changed = null
      }
    },
    capabilities: vi.fn(),
    requestPhoneCode: vi.fn(),
    verifyPhoneCode: vi.fn(),
    loginExisting: vi.fn(),
    completeSecondFactor: vi.fn(),
    updateProfile: vi.fn(),
    requestBindingCode: vi.fn(),
    submitStepUp: vi.fn(),
    bindPhone: vi.fn(),
    logout: vi.fn()
  }

  const sent: any[] = []
  const win = { isDestroyed: () => false, webContents: { send: (...args: any[]) => sent.push(args) }, once: vi.fn() }
  const other = { isDestroyed: () => false, webContents: { send: vi.fn() }, once: vi.fn() }
  const sender: any = { mainFrame: {} }
  const captcha = { acquire: vi.fn().mockResolvedValue({ turnstile_token: 'main-owned-proof' }) }

  const controller = registerPlatformIpc({
    ipc: ipc as any,
    auth,
    captcha,
    fromWebContents: (value: unknown) => (value === sender ? (win as any) : (other as any)),
    trustedRendererUrl: 'http://127.0.0.1:5174/'
  })

  controller.registerWindow(win as any)
  const event = { sender, senderFrame: sender.mainFrame }

  return {
    auth,
    captcha,
    controller,
    event,
    handlers,
    other,
    sent,
    snapshot,
    win,
    emit: (value = snapshot) => changed?.(value)
  }
}

describe('platform account IPC', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('allows only registered app windows at the trusted main-frame URL', async () => {
    const f = rig()

    ;(f.event.senderFrame as any).url = 'http://127.0.0.1:5174/?peer=1#/chat'
    expect(f.handlers.get('aino:platform-account:status')!(f.event)).toBe(f.snapshot)

    expect(() =>
      f.handlers.get('aino:platform-account:status')!({ ...f.event, senderFrame: { url: 'http://127.0.0.1:5174/' } })
    ).toThrow('unauthorized_platform_ipc')
    const unregisteredSender: any = { mainFrame: { url: 'http://127.0.0.1:5174/' } }
    expect(() =>
      f.handlers.get('aino:platform-account:status')!({
        sender: unregisteredSender,
        senderFrame: unregisteredSender.mainFrame
      })
    ).toThrow('unauthorized_platform_ipc')
    ;(f.event.senderFrame as any).url = 'https://evil.test/'
    expect(() => f.handlers.get('aino:platform-account:status')!(f.event)).toThrow('unauthorized_platform_ipc')
  })

  it('broadcasts snapshots to every registered live window and stops after unregister', () => {
    const f = rig()
    f.controller.registerWindow(f.other as any)
    f.emit()
    expect(f.sent).toEqual([['aino:platform-account:changed', f.snapshot]])
    expect(f.other.webContents.send).toHaveBeenCalledWith('aino:platform-account:changed', f.snapshot)
    f.controller.unregisterWindow(f.other as any)
    f.emit({ ...f.snapshot, revision: 2 })
    expect(f.other.webContents.send).toHaveBeenCalledTimes(1)
  })

  it('closing one account window does not log out the shared account', () => {
    const f = rig()
    f.controller.unregisterWindow(f.win as any)
    expect(f.auth.logout).not.toHaveBeenCalled()
    expect(f.auth.snapshot()).toBe(f.snapshot)
  })

  it('gets captcha proof in main for the originating request instead of trusting renderer proof', async () => {
    const f = rig()

    ;(f.event.senderFrame as any).url = 'http://127.0.0.1:5174/'
    await f.handlers.get('aino:platform-account:request-phone-code')!(f.event, { phone: '13900000000' })
    expect(f.captcha.acquire).toHaveBeenCalledOnce()
    expect(f.auth.requestPhoneCode).toHaveBeenCalledWith({
      phone: '13900000000',
      captcha_proof: { turnstile_token: 'main-owned-proof' }
    })
    await expect(
      f.handlers.get('aino:platform-account:request-phone-code')!(f.event, {
        phone: '13900000000',
        captcha_proof: { turnstile_token: 'renderer-proof' }
      })
    ).rejects.toThrow('renderer_captcha_proof_rejected')
  })

  it('rejects malformed account input before opening captcha', async () => {
    const f = rig()

    ;(f.event.senderFrame as any).url = 'http://127.0.0.1:5174/'

    expect(() => f.handlers.get('aino:platform-account:request-phone-code')!(f.event, { phone: '' })).toThrow(
      'invalid_platform_input'
    )
    expect(f.captcha.acquire).not.toHaveBeenCalled()

    expect(() =>
      f.handlers.get('aino:platform-account:login-existing')!(f.event, {
        email: 'a@example.test',
        password: 42,
        remember: true
      })
    ).toThrow('invalid_platform_input')
    expect(f.captcha.acquire).not.toHaveBeenCalled()
  })
})
