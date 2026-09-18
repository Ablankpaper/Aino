// @ts-check

const SETTINGS_URL = /[#/]settings(?:[/?]|$)/

/** @param {unknown} value */
function isValidBackendStatus(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof value.version === 'string' &&
    value.version.length > 0 &&
    typeof value.active_sessions === 'number' &&
    Number.isFinite(value.active_sessions) &&
    value.active_sessions >= 0 &&
    typeof value.gateway_running === 'boolean',
  )
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 * @param {string} message
 * @returns {Promise<T>}
 */
function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs)
    promise.then(
      value => { clearTimeout(timer); resolve(value) },
      error => { clearTimeout(timer); reject(error) },
    )
  })
}

/** @param {any} window @param {number} timeoutMs */
async function readBackendStatus(window, timeoutMs) {
  let status
  try {
    status = await withTimeout(
      window.evaluate(({ requestTimeoutMs }) => {
        const api = globalThis.window?.hermesDesktop?.api
        if (typeof api !== 'function') return null
        return api({ path: '/api/status', timeoutMs: requestTimeoutMs })
      }, { requestTimeoutMs: timeoutMs }),
      timeoutMs,
      'backend status RPC timed out',
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'backend status RPC timed out') throw error
    throw new Error('backend status RPC failed')
  }

  if (!isValidBackendStatus(status)) {
    throw new Error('invalid backend status response')
  }
  return status
}

/**
 * @param {any} app
 * @param {{windowTimeoutMs: number, pollIntervalMs: number}} options
 */
async function findMainRenderer(app, options) {
  await app.firstWindow({ timeout: options.windowTimeoutMs })
  const deadline = Date.now() + options.windowTimeoutMs

  do {
    for (const candidate of app.windows()) {
      const remainingMs = Math.max(1, deadline - Date.now())
      const marker = await withTimeout(
        candidate.evaluate(() => ({
          hasButton: document.querySelector('button') !== null,
          hasMainRoot: document.querySelector('#root') !== null,
          hasDesktopApi: typeof globalThis.window?.hermesDesktop?.api === 'function',
        })),
        Math.min(2_000, remainingMs),
        'renderer identity probe timed out',
      ).catch(() => null)
      if (marker?.hasMainRoot && marker.hasDesktopApi) return candidate
    }
    await new Promise(resolve => setTimeout(resolve, options.pollIntervalMs))
  } while (Date.now() <= deadline)

  throw new Error('real Aino/Hermes main renderer did not appear before launch timeout')
}

/**
 * @param {any} app
 * @param {{
 *   prepareWindowForInput: (app: any, window: any) => Promise<void>,
 *   backendTimeoutMs?: number,
 *   navigationTimeoutMs?: number,
 *   pollIntervalMs?: number,
 *   windowTimeoutMs?: number,
 *   log?: (message: string) => void,
 * }} options
 */
async function acceptDesktopLaunch(app, options) {
  const backendTimeoutMs = options.backendTimeoutMs ?? 15_000
  const navigationTimeoutMs = options.navigationTimeoutMs ?? 180_000
  const pollIntervalMs = options.pollIntervalMs ?? 1_000
  const windowTimeoutMs = options.windowTimeoutMs ?? 120_000
  const log = options.log ?? (() => undefined)
  const window = await findMainRenderer(app, { windowTimeoutMs, pollIntervalMs })

  await window.waitForLoadState('domcontentloaded')
  await options.prepareWindowForInput(app, window)

  const chooseLater = window.getByRole('button', { name: /choose a provider later|skip/i }).first()
  const settings = window.getByRole('button', { name: /open settings|settings/i }).first()
  const deadline = Date.now() + navigationTimeoutMs
  let attempt = 0

  while (Date.now() <= deadline) {
    attempt += 1
    if (!SETTINGS_URL.test(window.url())) {
      await chooseLater.click({ timeout: Math.min(2_000, navigationTimeoutMs) })
        .then(async () => {
          log('dismissed onboarding overlay')
          await chooseLater.waitFor({ state: 'hidden', timeout: Math.min(15_000, navigationTimeoutMs) }).catch(() => undefined)
        })
        .catch(() => undefined)

      try {
        await settings.click({ timeout: Math.min(4_000, navigationTimeoutMs) })
        await window.waitForURL(SETTINGS_URL, { timeout: Math.min(4_000, navigationTimeoutMs) })
      } catch {
        if (attempt === 1 || attempt % 5 === 0) log(`Settings navigation not ready (attempt ${attempt})`)
      }
    }

    if (SETTINGS_URL.test(window.url())) {
      const status = await readBackendStatus(window, backendTimeoutMs)
      return { window, status }
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error('main renderer did not navigate to Settings before launch timeout')
}

module.exports = { acceptDesktopLaunch, isValidBackendStatus, readBackendStatus }
