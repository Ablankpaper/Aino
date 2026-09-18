import { createRequire } from 'node:module'

import { expect, test } from 'vitest'

const { acceptDesktopLaunch } = createRequire(import.meta.url)(
  '../../../tests/install/e2e-assets/launch-acceptance.cjs',
)

function fakePage(options: {
  marker: { hasButton: boolean; hasMainRoot: boolean; hasDesktopApi: boolean }
  status?: unknown | (() => Promise<unknown>)
}) {
  let evaluations = 0
  let url = 'file:///app/index.html'
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

function fakeApp(page: ReturnType<typeof fakePage>) {
  return {
    firstWindow: async () => page,
    windows: () => [page],
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
