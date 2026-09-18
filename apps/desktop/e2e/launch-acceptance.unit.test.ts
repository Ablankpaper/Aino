import { createRequire } from 'node:module'

import { expect, test } from 'vitest'

const { acceptDesktopLaunch, withOwnedApplication } = createRequire(import.meta.url)(
  '../../../tests/install/e2e-assets/launch-acceptance.cjs',
)

function fakePage(options: {
  marker: { hasButton: boolean; hasMainRoot: boolean; hasDesktopApi: boolean }
  initialUrl?: string
  status?: unknown | (() => Promise<unknown>)
}) {
  let evaluations = 0
  let url = options.initialUrl ?? 'file:///app/index.html'
  const settings = {
    click: async () => { url = 'file:///app/index.html#/settings' },
  }
  const chooseLater = {
    click: async () => { throw new Error('not visible') },
    waitFor: async () => undefined,
  }

  return {
    evaluate: async () => {
      evaluations += 1
      if (evaluations === 1) return options.marker
      if (typeof options.status === 'function') return options.status()
      return options.status
    },
    getByRole: (_role: string, query: { name: RegExp }) => ({
      first: () => query.name.test('Open settings') ? settings : chooseLater,
    }),
    screenshot: async () => undefined,
    url: () => url,
    waitForLoadState: async () => undefined,
    waitForURL: async (pattern: RegExp) => {
      if (!pattern.test(url)) throw new Error(`URL did not match: ${url}`)
    },
  }
}

function fakeApp(...pages: ReturnType<typeof fakePage>[]) {
  return {
    firstWindow: async () => pages[0],
    windows: () => pages,
  }
}

const fastOptions = {
  backendTimeoutMs: 15,
  navigationTimeoutMs: 20,
  pollIntervalMs: 1,
  prepareWindowForInput: async () => undefined,
  windowTimeoutMs: 20,
}

test('rejects an unrelated Electron window that merely contains a button', async () => {
  const page = fakePage({
    marker: { hasButton: true, hasMainRoot: false, hasDesktopApi: false },
  })

  await expect(acceptDesktopLaunch(fakeApp(page), fastOptions)).rejects.toThrow(
    /main renderer/i,
  )
})

test('rejects the main renderer when its backend status RPC never responds', async () => {
  const page = fakePage({
    marker: { hasButton: true, hasMainRoot: true, hasDesktopApi: true },
    status: () => new Promise(() => undefined),
  })

  await expect(acceptDesktopLaunch(fakeApp(page), fastOptions)).rejects.toThrow(
    /backend status RPC timed out/i,
  )
})

test('rejects a backend status response without the liveness contract', async () => {
  const page = fakePage({
    marker: { hasButton: true, hasMainRoot: true, hasDesktopApi: true },
    status: { version: '0.21.3' },
  })

  await expect(acceptDesktopLaunch(fakeApp(page), fastOptions)).rejects.toThrow(
    /invalid backend status response/i,
  )
})

test('skips an auxiliary renderer before accepting the main Settings window', async () => {
  const auxiliary = fakePage({
    initialUrl: 'file:///app/index.html?win=intro',
    marker: { hasButton: true, hasMainRoot: true, hasDesktopApi: true },
  })
  const main = fakePage({
    marker: { hasButton: true, hasMainRoot: true, hasDesktopApi: true },
    status: { version: '0.21.3', active_sessions: 0, gateway_running: false },
  })

  const accepted = await acceptDesktopLaunch(fakeApp(auxiliary, main), fastOptions)

  expect(accepted.window).toBe(main)
})

test('rejection closes only the supplied application process tree', async () => {
  const rootSignals: string[] = []
  const descendantSignals: Array<[number, string]> = []
  const processHandle = {
    pid: 100,
    kill: (signal: string) => { rootSignals.push(signal) },
    once: () => undefined,
  }
  const app = {
    close: async () => { throw new Error('renderer rejected close') },
    process: () => processHandle,
  }

  await expect(withOwnedApplication(
    app,
    'rejected launch',
    async () => { throw new Error('acceptance rejected') },
    {
      closeTimeoutMs: 1,
      descendantGraceMs: 0,
      execFileSync: () => '100 1\n101 100\n102 101\n200 1\n',
      kill: (pid: number, signal: string) => { descendantSignals.push([pid, signal]) },
      log: () => undefined,
      platform: 'darwin',
      sleep: async () => undefined,
      termTimeoutMs: 1,
    },
  )).rejects.toThrow('acceptance rejected')

  expect(rootSignals).toEqual(['SIGTERM', 'SIGKILL'])
  expect(descendantSignals).toEqual([
    [101, 'SIGTERM'],
    [102, 'SIGTERM'],
    [101, 'SIGKILL'],
    [102, 'SIGKILL'],
  ])
})
