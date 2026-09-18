// @ts-check

const { execFileSync: nodeExecFileSync } = require('node:child_process')

const SETTINGS_URL = /[#/]settings(?:[/?]|$)/

/** @param {number} ms */
const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** @param {number} pid */
function defaultIsPidAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code === 'EPERM'
  }
}

/** @param {number} timeoutMs */
function descendantSnapshotCommand(timeoutMs) {
  return {
    file: 'ps',
    args: ['-eo', 'pid=,ppid='],
    options: { encoding: 'utf8', timeout: timeoutMs },
  }
}

/** @param {number} timeoutMs */
function windowsDescendantSnapshotCommand(timeoutMs) {
  return {
    file: 'powershell.exe',
    args: [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress',
    ],
    options: { encoding: 'utf8', timeout: timeoutMs, windowsHide: true },
  }
}

/** @param {number} rootPid @param {number} timeoutMs */
function windowsTreeKillCommand(rootPid, timeoutMs) {
  return {
    file: 'taskkill.exe',
    args: ['/PID', String(rootPid), '/T', '/F'],
    options: { encoding: 'utf8', timeout: timeoutMs, windowsHide: true },
  }
}

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

/** @param {string} output @param {number} rootPid */
function windowsDescendantPids(output, rootPid) {
  const decoded = JSON.parse(output)
  const rows = Array.isArray(decoded) ? decoded : [decoded]
  const pairs = rows.map(row => `${Number(row?.ProcessId)} ${Number(row?.ParentProcessId)}`).join('\n')
  return descendantPids(pairs, rootPid)
}

/**
 * @param {number[]} pids
 * @param {{
 *   isPidAlive: (pid: number) => boolean,
 *   pollIntervalMs: number,
 *   sleep: (ms: number) => Promise<void>,
 *   timeoutMs: number,
 * }} options
 */
async function waitForProcessTreeExit(pids, options) {
  const pollIntervalMs = Math.max(1, options.pollIntervalMs)
  const timeoutMs = Math.max(0, options.timeoutMs)
  const attempts = Math.max(1, Math.ceil(timeoutMs / pollIntervalMs))
  let remaining = pids
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    remaining = pids.filter(pid => options.isPidAlive(pid))
    if (!remaining.length || attempt === attempts) return remaining
    await options.sleep(Math.min(pollIntervalMs, timeoutMs))
  }
  return remaining
}

/**
 * Close an application and only the process descendants rooted at its own PID.
 * @param {any} application
 * @param {string} label
 * @param {{
 *   closeTimeoutMs?: number,
 *   descendantGraceMs?: number,
 *   discoveryTimeoutMs?: number,
 *   execFileSync?: typeof nodeExecFileSync,
 *   forceTimeoutMs?: number,
 *   isPidAlive?: (pid: number) => boolean,
 *   kill?: typeof process.kill,
 *   log?: (message: string) => void,
 *   platform?: string,
 *   quiescencePollMs?: number,
 *   quiescenceTimeoutMs?: number,
 *   sleep?: (ms: number) => Promise<void>,
 *   termTimeoutMs?: number,
 * }} [options]
 */
async function boundedClose(application, label, options = {}) {
  const closeTimeoutMs = options.closeTimeoutMs ?? 15_000
  const descendantGraceMs = options.descendantGraceMs ?? 5_000
  const discoveryTimeoutMs = options.discoveryTimeoutMs ?? 5_000
  const execFileSync = options.execFileSync ?? nodeExecFileSync
  const forceTimeoutMs = options.forceTimeoutMs ?? 10_000
  const isPidAlive = options.isPidAlive ?? defaultIsPidAlive
  const kill = options.kill ?? process.kill.bind(process)
  const log = options.log ?? (() => undefined)
  const platform = options.platform ?? process.platform
  const quiescencePollMs = options.quiescencePollMs ?? 100
  const quiescenceTimeoutMs = options.quiescenceTimeoutMs ?? 5_000
  const sleep = options.sleep ?? defaultSleep
  const termTimeoutMs = options.termTimeoutMs ?? 10_000

  let proc = null
  try { proc = application.process() } catch { /* connection gone */ }
  const rootPid = proc?.pid
  let descendants = []
  let cleanupError = null
  if (rootPid) {
    try {
      const command = platform === 'win32'
        ? windowsDescendantSnapshotCommand(discoveryTimeoutMs)
        : descendantSnapshotCommand(discoveryTimeoutMs)
      const output = execFileSync(command.file, command.args, command.options)
      descendants = platform === 'win32'
        ? windowsDescendantPids(output, rootPid)
        : descendantPids(output, rootPid)
    } catch (error) {
      cleanupError = `${label}: descendant snapshot failed`
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
    if (rootPid && platform === 'win32') {
      log(`${label}: graceful close failed or timed out after ${closeTimeoutMs}ms - terminating owned Windows process tree`)
      const command = windowsTreeKillCommand(rootPid, forceTimeoutMs)
      try {
        execFileSync(command.file, command.args, command.options)
      } catch {
        cleanupError = `${label}: Windows owned process tree termination failed`
        log(`${label}: Windows owned process tree termination failed or timed out after ${forceTimeoutMs}ms`)
      }
    } else if (proc) {
      log(`${label}: graceful close failed or timed out after ${closeTimeoutMs}ms - SIGTERM, then SIGKILL if needed`)
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
      cleanupError = `${label}: graceful close failed and no owned process handle was available`
      log(`${label}: no process handle to signal - cleanup cannot be verified`)
    }
  }

  if (platform !== 'win32' && descendants.length) {
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

  const ownedPids = rootPid ? [rootPid, ...descendants] : descendants
  const remaining = await waitForProcessTreeExit([...new Set(ownedPids)], {
    isPidAlive,
    pollIntervalMs: quiescencePollMs,
    sleep,
    timeoutMs: quiescenceTimeoutMs,
  })
  if (remaining.length) {
    throw new Error(`${label}: owned process tree did not exit within ${quiescenceTimeoutMs}ms (${remaining.length} process(es) remain)`)
  }
  if (cleanupError) throw new Error(cleanupError)
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
  descendantSnapshotCommand,
  isValidBackendStatus,
  readBackendStatus,
  windowsDescendantSnapshotCommand,
  windowsTreeKillCommand,
  withOwnedApplication,
}
