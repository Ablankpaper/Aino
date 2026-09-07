import { expect, test } from './test'

import { type MockBackendFixture, setupMockBackend, waitForAppReady } from './fixtures'

let fixture: MockBackendFixture | null = null

test.beforeAll(async () => {
  fixture = await setupMockBackend({ extraDisplayConfig: '  language: zh' })
  await waitForAppReady(fixture, 120_000)
})

test.afterAll(async () => {
  await fixture?.cleanup()
  fixture = null
})

test('keeps the short reasoning label on one line beside its settings control', async () => {
  const page = fixture!.page

  await page.evaluate(() => { window.location.hash = '#/settings?tab=config:model' })
  const effortControl = page.getByRole('combobox').filter({ hasText: /^中$/ }).first()
  await expect(effortControl).toBeVisible({ timeout: 30_000 })

  // Measure the real localized text node, not the surrounding flex box or a
  // source class. A full-width select used to squeeze it into two vertical
  // characters even in a wide desktop window.
  const lines = await effortControl.locator('..').evaluate(element => {
    const text = Array.from(element.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === '推理')

    if (!text) throw new Error('Reasoning label text is missing')
    const range = document.createRange()
    range.selectNodeContents(text)

    return new Set(Array.from(range.getClientRects()).map(rect => Math.round(rect.top))).size
  })

  expect(lines).toBe(1)
  await page.screenshot({ path: test.info().outputPath('settings-label.png') })
})
