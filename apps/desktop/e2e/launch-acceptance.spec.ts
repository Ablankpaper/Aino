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
      prepareWindowForInput: async (app, page) => {
        await prepareWindowForInput(app, page)

        const loginCard = page.locator('[data-account-login-card]')
        await expect(loginCard).toBeVisible({ timeout: 120_000 })
        await page.getByRole('textbox', { name: 'Phone number', exact: true }).fill('+8613800138000')
        await page
          .getByRole('checkbox', { name: 'Agree to the user agreement and privacy policy', exact: true })
          .check()
        await page.getByRole('checkbox', { name: 'Keep me signed in on this device', exact: true }).uncheck()
        await page.getByRole('button', { name: 'Send code', exact: true }).click()
        await page.getByRole('textbox', { name: 'Verification code', exact: true }).fill('1234')
        await page.getByRole('button', { name: 'Sign in', exact: true }).click()
        await expect(loginCard).toHaveCount(0, { timeout: 120_000 })
      },
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
