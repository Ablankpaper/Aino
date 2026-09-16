import type {
  BindPlatformModelResult,
  PlatformAccountIpcResult,
  PlatformAccountSnapshot,
  PlatformCaptchaProof,
  PlatformModel
} from '../shared/platform-contract'

import type { PlatformAuth } from './platform-auth'
import type { PlatformRuntimeBindingController } from './platform-runtime-binding'
import { parsePlatformUsageQuery } from './platform-usage-contract'

interface IpcLike {
  handle(channel: string, handler: (...args: any[]) => unknown): void
  removeHandler?(channel: string): void
}
interface WindowLike {
  isDestroyed(): boolean
  webContents: {
    isDestroyed(): boolean
    mainFrame: { url: string }
    send(channel: string, payload: unknown): void
  }
  once?(event: string, listener: () => void): void
}

const LOCAL_PLATFORM_ERROR_CODES = new Set([
  'invalid_platform_input',
  'renderer_captcha_proof_rejected',
  'unauthorized_platform_ipc'
])

function sameRendererDocument(actualRaw: string, trustedRaw: string) {
  try {
    const actual = new URL(actualRaw)
    const trusted = new URL(trustedRaw)

    return (
      actual.protocol === trusted.protocol &&
      actual.hostname === trusted.hostname &&
      actual.port === trusted.port &&
      actual.pathname === trusted.pathname
    )
  } catch {
    return false
  }
}

export function registerPlatformIpc({
  ipc,
  auth,
  captcha,
  fromWebContents,
  trustedRendererUrl,
  bindingController
}: {
  ipc: IpcLike
  auth: PlatformAuth
  captcha: { acquire(): Promise<PlatformCaptchaProof> }
  fromWebContents(sender: unknown): WindowLike | null
  trustedRendererUrl: string
  bindingController?: PlatformRuntimeBindingController
}) {
  const windows = new Set<WindowLike>()

  function authorize(event: any) {
    const win = fromWebContents(event?.sender)

    if (
      !win ||
      !windows.has(win) ||
      win.isDestroyed() ||
      win.webContents.isDestroyed() ||
      event.senderFrame !== event.sender?.mainFrame ||
      !sameRendererDocument(String(event.senderFrame?.url || ''), trustedRendererUrl)
    ) {
      throw new Error('unauthorized_platform_ipc')
    }

    return win
  }

  function record(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('invalid_platform_input')
    }

    return input as Record<string, unknown>
  }

  function field(input: Record<string, unknown>, name: string, max: number, optional = false) {
    const value = input[name]

    if (optional && value === undefined) {
      return undefined
    }

    if (typeof value !== 'string' || value.length < 1 || value.length > max) {
      throw new Error('invalid_platform_input')
    }

    return value
  }

  function boundedString(input: Record<string, unknown>, name: string, max: number) {
    const value = input[name]

    if (typeof value !== 'string' || value.length > max) {
      throw new Error('invalid_platform_input')
    }

    return value
  }

  function safeIpcError(error: unknown) {
    const source = error && typeof error === 'object' ? (error as Record<string, unknown>) : {}
    const message = error instanceof Error ? error.message : ''

    const candidate =
      typeof source.code === 'string' ? source.code : LOCAL_PLATFORM_ERROR_CODES.has(message) ? message : ''

    const code = /^[A-Za-z0-9_.:-]{1,80}$/.test(candidate) ? candidate : 'platform_error'
    const retry = source.retryAfter ?? source.retry_after

    return {
      code,
      ...(typeof retry === 'number' && Number.isSafeInteger(retry) && retry >= 0 ? { retry_after: retry } : {})
    }
  }

  function flag(input: Record<string, unknown>, name: string) {
    if (typeof input[name] !== 'boolean') {
      throw new Error('invalid_platform_input')
    }

    return input[name] as boolean
  }

  function phone(input: unknown) {
    const value = record(input)

    return { phone: field(value, 'phone', 64) }
  }

  async function withCaptcha(raw: unknown, input: Record<string, unknown>, operation: (next: any) => unknown) {
    const source = record(raw)

    if (source.captcha_proof && Object.keys(source.captcha_proof as object).length > 0) {
      throw new Error('renderer_captcha_proof_rejected')
    }

    const proof = await captcha.acquire()

    return operation({ ...input, captcha_proof: proof })
  }

  const methods: Record<string, (event: any, input?: any) => unknown> = {
    status: event => {
      authorize(event)

      return auth.snapshot()
    },
    capabilities: event => {
      authorize(event)

      return auth.capabilities()
    },
    retry: event => {
      authorize(event)

      return auth.retry()
    },
    'request-phone-code': (event, input) => {
      authorize(event)

      return withCaptcha(input, phone(input), next => auth.requestPhoneCode(next))
    },
    'verify-phone-code': (event, input) => {
      authorize(event)
      const value = record(input)

      return auth.verifyPhoneCode({
        phone: field(value, 'phone', 64),
        challenge_id: field(value, 'challenge_id', 256),
        code: field(value, 'code', 64),
        register_if_new: flag(value, 'register_if_new'),
        agreement_revision: boundedString(value, 'agreement_revision', 256),
        invitation_code: field(value, 'invitation_code', 256, true),
        promo_code: field(value, 'promo_code', 256, true),
        remember: flag(value, 'remember')
      })
    },
    'login-existing': (event, input) => {
      authorize(event)
      const value = record(input)

      return withCaptcha(
        input,
        {
          email: field(value, 'email', 320),
          password: field(value, 'password', 4096),
          remember: flag(value, 'remember')
        },
        next => auth.loginExisting(next)
      )
    },
    'complete-second-factor': (event, input) => {
      authorize(event)

      return auth.completeSecondFactor({ totp_code: field(record(input), 'totp_code', 64) })
    },
    'update-profile': (event, input) => {
      authorize(event)

      return auth.updateProfile({ display_name: field(record(input), 'display_name', 128) })
    },
    'request-binding-code': (event, input) => {
      authorize(event)

      return withCaptcha(input, phone(input), next => auth.requestBindingCode(next))
    },
    'submit-step-up': (event, input) => {
      authorize(event)

      return auth.submitStepUp({ totp_code: field(record(input), 'totp_code', 64) })
    },
    'bind-phone': (event, input) => {
      authorize(event)
      const value = record(input)

      return auth.bindPhone({
        phone: field(value, 'phone', 64),
        challenge_id: field(value, 'challenge_id', 256),
        code: field(value, 'code', 64)
      })
    },
    logout: event => {
      authorize(event)

      return auth.logout()
    }
  }

  for (const [name, handler] of Object.entries(methods)) {
    ipc.handle(`aino:platform-account:${name}`, async (...args) => {
      try {
        return { ok: true, value: await handler(args[0], args[1]) } satisfies PlatformAccountIpcResult<unknown>
      } catch (error) {
        return { ok: false, error: safeIpcError(error) } satisfies PlatformAccountIpcResult<unknown>
      }
    })
  }

  // Platform models binding IPC handlers
  ipc.handle('aino:platform-billing:usage', async (event, input) => {
    try {
      authorize(event)
      const source = record(input)

      return { ok: true, value: await auth.listUsage(parsePlatformUsageQuery(source), field(source, 'expected_user_id', 128)) }
    } catch (error) {
      return { ok: false, error: safeIpcError(error) }
    }
  })

  if (bindingController) {
    ipc.handle('aino:platform-models:owner', (event, revision) => {
      try {
        authorize(event)

        return { ok: true, value: bindingController.owner(revision) }
      } catch (error) {
        return { ok: false, error: safeIpcError(error) }
      }
    })
    ipc.handle('aino:platform-models:bind', async (event, input) => {
      try {
        const win = authorize(event)
        const value = record(input)

        const bindInput = {
          connection_id: boundedString(value, 'connection_id', 256),
          profile: boundedString(value, 'profile', 256),
          session_id: field(value, 'session_id', 256),
          model_id: field(value, 'model_id', 256),
          session_ticket: field(value, 'session_ticket', 256),
          expected_account_revision:
            typeof value.expected_account_revision === 'number' ? value.expected_account_revision : 0
        }

        return await bindingController.bind(bindInput, win)
      } catch (error) {
        const ipcError = safeIpcError(error)

        return { ok: false, error: { code: ipcError.code } } satisfies BindPlatformModelResult
      }
    })

    ipc.handle('aino:platform-models:list', async event => {
      try {
        authorize(event)

        return { ok: true, value: await bindingController.list() } satisfies PlatformAccountIpcResult<PlatformModel[]>
      } catch (error) {
        return { ok: false, error: safeIpcError(error) } satisfies PlatformAccountIpcResult<PlatformModel[]>
      }
    })
    ipc.handle('aino:platform-models:clear', (event, input) => {
      try {
        const win = authorize(event)
        const value = record(input)
        bindingController.clear(
          {
            connection_id: boundedString(value, 'connection_id', 256),
            profile: boundedString(value, 'profile', 256),
            session_id: field(value, 'session_id', 256)
          },
          win
        )

        return { ok: true, value: null }
      } catch (error) {
        return { ok: false, error: safeIpcError(error) }
      }
    })
  }

  const unsubscribe = auth.subscribe((snapshot: PlatformAccountSnapshot) => {
    for (const win of windows) {
      try {
        if (win.isDestroyed() || win.webContents.isDestroyed()) {
          windows.delete(win)

          continue
        }

        if (!sameRendererDocument(win.webContents.mainFrame.url, trustedRendererUrl)) {
          continue
        }

        win.webContents.send('aino:platform-account:changed', snapshot)
      } catch {
        windows.delete(win)
      }
    }
  })

  function unregisterWindow(win: WindowLike) {
    bindingController?.releaseWindow(win)
    windows.delete(win)
  }

  return {
    registerWindow(win: WindowLike) {
      windows.add(win)
      win.once?.('closed', () => unregisterWindow(win))
    },
    unregisterWindow,
    dispose() {
      ipc.removeHandler?.('aino:platform-billing:usage')
      bindingController?.dispose()
      unsubscribe()
      windows.clear()

      for (const name of Object.keys(methods)) {
        ipc.removeHandler?.(`aino:platform-account:${name}`)
      }

      if (bindingController) {
        ipc.removeHandler?.('aino:platform-models:bind')
        ipc.removeHandler?.('aino:platform-models:list')
        ipc.removeHandler?.('aino:platform-models:clear')
        ipc.removeHandler?.('aino:platform-models:owner')
      }
    }
  }
}
