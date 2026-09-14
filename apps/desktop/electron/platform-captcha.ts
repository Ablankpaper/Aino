import type { PlatformCaptchaProof, PlatformPublicCapabilities } from '../shared/platform-contract'

export class PlatformCaptchaError extends Error {
  constructor(public readonly code: string) {
    super(code)
  }
}

interface CaptchaSubmit {
  window: object
  mainFrame: boolean
  url: string
  nonce: string
  proof: PlatformCaptchaProof
}

interface PendingCaptcha {
  window: object
  url: string
  nonce: string
  generation: number
  consumed: boolean
  policy: Promise<string>
  resolve: (proof: PlatformCaptchaProof) => void
  reject: (error: Error) => void
}

const PROOF_KEYS = new Set(['turnstile_token', 'tencent_captcha_ticket', 'tencent_captcha_randstr'])

function trustedSender(pending: PendingCaptcha, window: object, mainFrame: boolean, rawUrl: string) {
  if (!mainFrame || window !== pending.window) {
    return false
  }

  try {
    const actual = new URL(rawUrl)
    const expected = new URL(pending.url)

    return (
      actual.origin === expected.origin &&
      actual.pathname === expected.pathname &&
      actual.search === '' &&
      actual.hash === ''
    )
  } catch {
    return false
  }
}

function validateProof(proof: PlatformCaptchaProof, capabilities: PlatformPublicCapabilities) {
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    throw new PlatformCaptchaError('captcha_proof_invalid')
  }

  for (const [key, value] of Object.entries(proof)) {
    if (!PROOF_KEYS.has(key) || typeof value !== 'string' || value.length < 1 || value.length > 4096) {
      throw new PlatformCaptchaError('captcha_proof_invalid')
    }
  }

  const keys = Object.keys(proof)

  switch (capabilities.captcha.provider) {
    case 'disabled':
      if (keys.length !== 0) {
        throw new PlatformCaptchaError('captcha_proof_invalid')
      }

      break

    case 'turnstile':

    case 'aliyun':
      if (keys.length !== 1 || !proof.turnstile_token) {
        throw new PlatformCaptchaError('captcha_proof_required')
      }

      break

    case 'tencent':
      if (keys.length !== 2 || !proof.tencent_captcha_ticket || !proof.tencent_captcha_randstr) {
        throw new PlatformCaptchaError('captcha_proof_required')
      }

      break
  }
}

export function createPlatformCaptchaBroker({
  capabilities,
  generation,
  randomNonce
}: {
  capabilities: () => Promise<PlatformPublicCapabilities>
  generation: () => number
  randomNonce: () => string
}) {
  let pending: PendingCaptcha | null = null

  return {
    begin(window: object, url: string): Promise<PlatformCaptchaProof> {
      pending?.reject(new PlatformCaptchaError('captcha_superseded'))

      return new Promise((resolve, reject) => {
        pending = {
          window,
          url,
          nonce: randomNonce(),
          generation: generation(),
          consumed: false,
          policy: capabilities().then(value => JSON.stringify(value.captcha)),
          resolve,
          reject
        }
      })
    },
    getChallenge(input: { window: object; mainFrame: boolean; url: string }) {
      if (!pending || !trustedSender(pending, input.window, input.mainFrame, input.url)) {
        throw new PlatformCaptchaError('captcha_sender_rejected')
      }

      if (pending.consumed) {
        throw new PlatformCaptchaError('captcha_consumed')
      }

      return { nonce: pending.nonce }
    },
    async submit(input: CaptchaSubmit) {
      const active = pending

      if (!active || (input.window === active.window && active.consumed)) {
        throw new PlatformCaptchaError('captcha_consumed')
      }

      if (!trustedSender(active, input.window, input.mainFrame, input.url) || input.nonce !== active.nonce) {
        throw new PlatformCaptchaError('captcha_sender_rejected')
      }

      if (active.generation !== generation()) {
        pending = null
        const error = new PlatformCaptchaError('captcha_stale')
        active.reject(error)
        throw error
      }

      let initialPolicy: string
      let fresh: PlatformPublicCapabilities

      try {
        ;[initialPolicy, fresh] = await Promise.all([active.policy, capabilities()])
      } catch {
        if (active === pending) {
          pending = null
        }

        const error = new PlatformCaptchaError('captcha_policy_unavailable')
        active.reject(error)
        throw error
      }

      if (active !== pending || active.generation !== generation()) {
        if (active === pending) {
          pending = null
        }

        const error = new PlatformCaptchaError('captcha_stale')
        active.reject(error)
        throw error
      }

      if (initialPolicy !== JSON.stringify(fresh.captcha)) {
        pending = null
        const error = new PlatformCaptchaError('captcha_stale_policy')
        active.reject(error)
        throw error
      }

      validateProof(input.proof, fresh)
      active.consumed = true
      pending = active
      active.resolve({ ...input.proof })
    },
    cancel(window: object) {
      if (pending?.window === window && !pending.consumed) {
        const active = pending
        pending = null
        active.reject(new PlatformCaptchaError('captcha_cancelled'))
      }
    }
  }
}

interface CaptchaIpc {
  handle(channel: string, handler: (...args: any[]) => unknown): void
}
interface CaptchaWindow {
  webContents: {
    mainFrame?: unknown
    send?: (...args: unknown[]) => void
    setWindowOpenHandler?(handler: (...args: any[]) => { action: 'deny' }): void
    on?(event: string, handler: (...args: any[]) => void): void
  }
  isDestroyed(): boolean
  loadURL(url: string): Promise<unknown> | unknown
  close(): void
  show?(): void
  once?(event: string, handler: () => void): void
}

export function createPlatformCaptcha({
  ipc,
  createWindow,
  fromWebContents,
  origin,
  preloadPath,
  capabilities,
  generation,
  randomNonce
}: {
  ipc: CaptchaIpc
  createWindow(options: Record<string, unknown>): CaptchaWindow
  fromWebContents(sender: unknown): CaptchaWindow | null
  origin: string
  preloadPath: string
  capabilities: () => Promise<PlatformPublicCapabilities>
  generation: () => number
  randomNonce: () => string
}) {
  const captchaUrl = `${origin}/desktop/captcha`
  const broker = createPlatformCaptchaBroker({ capabilities, generation, randomNonce })
  let activeWindow: CaptchaWindow | null = null

  function senderInput(event: any) {
    const window = fromWebContents(event?.sender)

    return {
      window: window as object,
      mainFrame: Boolean(window && event.senderFrame === event.sender?.mainFrame),
      url: String(event.senderFrame?.url || '')
    }
  }

  ipc.handle('aino:platform-captcha:get', event => broker.getChallenge(senderInput(event)))
  ipc.handle('aino:platform-captcha:submit', (event, input) =>
    broker.submit({ ...senderInput(event), nonce: String(input?.nonce || ''), proof: input?.proof })
  )

  return {
    async acquire(): Promise<PlatformCaptchaProof> {
      if (activeWindow && !activeWindow.isDestroyed()) {
        activeWindow.close()
      }

      const win = createWindow({
        width: 400,
        height: 560,
        resizable: false,
        maximizable: false,
        minimizable: false,
        show: false,
        webPreferences: {
          preload: preloadPath,
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
          webviewTag: false
        }
      })

      activeWindow = win
      win.webContents.setWindowOpenHandler?.(() => ({ action: 'deny' }))
      win.webContents.on?.('will-attach-webview', event => event.preventDefault())

      const denyExternalNavigation = (event: { preventDefault(): void }, target: string) => {
        if (target !== captchaUrl) {
          event.preventDefault()
        }
      }

      win.webContents.on?.('will-navigate', denyExternalNavigation)
      win.webContents.on?.('will-redirect', denyExternalNavigation)
      const pending = broker.begin(win, captchaUrl)
      win.once?.('closed', () => {
        broker.cancel(win)

        if (activeWindow === win) {
          activeWindow = null
        }
      })
      win.once?.('ready-to-show', () => win.show?.())

      try {
        await win.loadURL(captchaUrl)
      } catch (error) {
        broker.cancel(win)

        if (!win.isDestroyed()) {
          win.close()
        }

        throw error
      }

      try {
        return await pending
      } finally {
        if (!win.isDestroyed()) {
          win.close()
        }
      }
    }
  }
}
