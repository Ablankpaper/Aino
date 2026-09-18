// @ts-check

const { execFileSync: nodeExecFileSync } = require('node:child_process')

const SETTINGS_URL = /[#/]settings(?:[/?]|$)/

/** @param {number} ms */
const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms))

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

/** @param {string} output @param {number} rootPid */
function descendantPids(output, rootPid) {
  const children = new Map()
  for (const line of output.trim().split('\n')) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number)
    if (!Number.isInteger(pid) || !Number.isInteger(ppid)) continue
    if (!children.has(ppid)) children.set(ppid, [])
    children.get(ppid).push(pid)
  }

  const descendants = []
  const queue = [rootPid]
  while (queue.length) {
    const parent = queue.shift()
    for (const child of children.get(parent) || []) {
      descendants.push(child)
      queue.push(child)
    }
  }
  return descendants
}

/**
 * Close an application and only the process descendants rooted at its own PID.
 * @param {any} application
 * @param {string} label
 * @param {{
 *   closeTimeoutMs?: number,
 *   descendantGraceMs?: number,
 *   execFileSync?: typeof nodeExecFileSync,
 *   kill?: typeof process.kill,
 *   log?: (message: string) => void,
 *   platform?: string,
 *   sleep?: (ms: number) => Promise<void>,
 *   termTimeoutMs?: number,
 * }} [options]
 */
async function boundedClose(application, label, options = {}) {
  const closeTimeoutMs = options.closeTimeoutMs ?? 15_000
  const descendantGraceMs = options.descendantGraceMs ?? 5_000
  const execFileSync = options.execFileSync ?? nodeExecFileSync
  const kill = options.kill ?? process.kill.bind(process)
  const log = options.log ?? (() => undefined)
  const platform = options.platform ?? process.platform
  const sleep = options.sleep ?? defaultSleep
  const termTimeoutMs = options.termTimeoutMs ?? 10_000

  let proc = null
  try { proc = application.process() } catch { /* connection gone */ }
  const rootPid = proc?.pid
  let descendants = []
  if (rootPid && platform !== 'win32') {
    try {
      descendants = descendantPids(execFileSync('ps', ['-eo', 'pid=,ppid='], { encoding: 'utf8' }), rootPid)
    } catch (error) {
      log(`${label}: descendant snapshot failed (continuing): ${String(error).slice(0, 120)}`)
    }
  }

  let closeAttempt
  try {
    closeAttempt = Promise.resolve(application.close()).then(() => true, () => false)
  } catch {
    closeAttempt = Promise.resolve(false)
  }
  const closed = await Promise.race([
    closeAttempt,
    sleep(closeTimeoutMs).then(() => false),
  ])

  if (!closed) {
    log(`${label}: graceful close failed or timed out after ${closeTimeoutMs}ms - SIGTERM, then SIGKILL if needed`)
    if (proc) {
      try { proc.kill('SIGTERM') } catch { /* already gone */ }
      const terminated = await Promise.race([
        new Promise(resolve => {
          try { proc.once('exit', () => resolve(true)) } catch { resolve(true) }
        }),
        sleep(termTimeoutMs).then(() => false),
      ])
      if (!terminated) {
        log(`${label}: SIGTERM ignored after ${termTimeoutMs}ms - SIGKILL`)
        try { proc.kill('SIGKILL') } catch { /* already gone */ }
      }
    } else {
      log(`${label}: no process handle to signal - relying on descendant sweep`)
    }
  }

  if (descendants.length) {
    for (const pid of descendants) {
      try { kill(pid, 'SIGTERM') } catch { /* raced exit */ }
    }
    await sleep(descendantGraceMs)
    let killed = 0
    for (const pid of descendants) {
      try { kill(pid, 'SIGKILL'); killed += 1 } catch { /* exited on TERM */ }
    }
    log(`${label}: swept ${descendants.length} descendant process(es) (${killed} needed SIGKILL)`)
  }
}

/**
 * @template T
 * @param {any} application
 * @param {string} label
 * @param {() => Promise<T>} work
 * @param {Parameters<typeof boundedClose>[2]} [closeOptions]
 * @returns {Promise<T>}
 */
async function withOwnedApplication(application, label, work, closeOptions) {
  try {
    return await work()
  } finally {
    await boundedClose(application, label, closeOptions)
  }
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
      try {
        if (new URL(candidate.url()).searchParams.has('win')) continue
      } catch { /* let the renderer markers decide non-standard URLs */ }
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

module.exports = {
  acceptDesktopLaunch,
  boundedClose,
  isValidBackendStatus,
  readBackendStatus,
  withOwnedApplication,
}
