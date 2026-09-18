import { createRequire } from 'node:module'

import { type ElectronApplication, expect, type Page, test } from '@playwright/test'

import { setupMockBackend } from './fixtures'

const require = createRequire(import.meta.url)
const { acceptDesktopLaunch } = require(
  '../../../tests/install/e2e-assets/launch-acceptance.cjs',
) as {
  acceptDesktopLaunch: (
    app: ElectronApplication,
    options: {
      prepareWindowForInput: (app: ElectronApplication, page: Page) => Promise<void>
      backendTimeoutMs: number
      navigationTimeoutMs: number
      windowTimeoutMs: number
    },
  ) => Promise<{ window: Page; status: { version: string; active_sessions: number; gateway_running: boolean } }>
}
const { prepareWindowForInput } = require(
  '../../../tests/install/e2e-assets/window-input.cjs',
) as { prepareWindowForInput: (app: ElectronApplication, page: Page) => Promise<void> }

test('installer launch gate accepts the isolated Aino renderer and backend', async () => {
  const fixture = await setupMockBackend({
    extraDisplayConfig: '  language: en',
    extraConfig: 'account:\n  dev_mode: true',
  })

  try {
    const accepted = await acceptDesktopLaunch(fixture.app, {
      prepareWindowForInput,
      backendTimeoutMs: 15_000,
      navigationTimeoutMs: 60_000,
      windowTimeoutMs: 60_000,
    })

    await expect(accepted.window).toHaveTitle(/Aino/)
    await expect(accepted.window).toHaveURL(/[#/]settings(?:[/?]|$)/)
    expect(accepted.status.version).not.toBe('')
    expect(accepted.status.active_sessions).toBeGreaterThanOrEqual(0)
    expect(typeof accepted.status.gateway_running).toBe('boolean')
  } finally {
    await fixture.cleanup()
  }
})
