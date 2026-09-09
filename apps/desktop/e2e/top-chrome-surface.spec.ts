/** Regression coverage for the Aino top-chrome surface contract. */

import { expect, test } from './test'

import { type MockBackendFixture, setupMockBackend, waitForAppReady } from './fixtures'

let fixture: MockBackendFixture | null = null

test.beforeAll(async () => {
  fixture = await setupMockBackend()
  await waitForAppReady(fixture, 120_000)
})

test.afterAll(async () => {
  await fixture?.cleanup()
  fixture = null
})

test('keeps the main titlebar and tab strip on one surface across chat states', async () => {
  const page = fixture!.page

  await page.waitForSelector('[data-slot="app-titlebar"]', { state: 'visible', timeout: 30_000 })
  await page.waitForSelector('[data-chat-surface]', { state: 'attached', timeout: 30_000 })

  const topSurfaceMetrics = () =>
    page.evaluate(() => {
      const titlebar = document.querySelector<HTMLElement>('[data-slot="app-titlebar"]')
      const strips = [...document.querySelectorAll<HTMLElement>('[data-zone-tabstrip]')]
      const mainStrip = strips.find(strip => strip.dataset.paneSurface === 'main')
      const sessionsStrip = strips.find(
        strip =>
          strip.dataset.paneSurface === 'sidebar' &&
          [...strip.querySelectorAll<HTMLElement>('[data-tree-tab]')].some(tab => tab.dataset.treeTab === 'sessions')
      )

      if (!titlebar) {
        throw new Error('Desktop shell did not render its titlebar')
      }

      const titlebarSeam = getComputedStyle(titlebar, '::before')
      const sash = document.querySelector<HTMLElement>('[role="separator"] span')

      return {
        mainStrip: mainStrip ? getComputedStyle(mainStrip).backgroundColor : null,
        sessionsStrip: sessionsStrip ? getComputedStyle(sessionsStrip).backgroundColor : null,
        titlebar: getComputedStyle(titlebar).backgroundColor,
        titlebarSeam: {
          borderRightColor: titlebarSeam.borderRightColor,
          borderRightStyle: titlebarSeam.borderRightStyle,
          borderRightWidth: titlebarSeam.borderRightWidth,
          boxShadow: titlebarSeam.boxShadow
        },
        sashStroke: sash ? getComputedStyle(sash).backgroundColor : null,
        glass: document.documentElement.hasAttribute('data-hermes-glass')
      }
    })

  const home = await topSurfaceMetrics()

  if (home.sessionsStrip && !home.glass) {
    expect(home.sessionsStrip, JSON.stringify(home)).not.toBe(home.titlebar)
  }

  // The default fresh-install tree keeps a lone workspace tab chromeless.
  // Reopen this isolated test window with the workspace + terminal stack shown
  // in the reported screenshot so the main strip is a real rendered surface.
  await page.evaluate(() => {
    localStorage.setItem(
      'hermes.desktop.layoutTree.v2',
      JSON.stringify({
        active: 'workspace',
        children: [
          { active: 'sessions', id: 'test-sessions', panes: ['sessions'], type: 'group' },
          { active: 'workspace', id: 'test-main', panes: ['workspace', 'terminal'], type: 'group' }
        ],
        id: 'test-root',
        orientation: 'row',
        type: 'split',
        weights: [1, 4]
      })
    )
  })
  await page.reload()
  await waitForAppReady(fixture!, 120_000)
  await page.waitForSelector('[data-pane-surface="main"]', { state: 'visible', timeout: 30_000 })

  const stackedHome = await topSurfaceMetrics()

  expect(await page.locator('[data-chat-surface][data-home-layout]').count()).toBeGreaterThan(0)
  expect(stackedHome.mainStrip, JSON.stringify(stackedHome)).not.toBeNull()
  expect(stackedHome.titlebar, JSON.stringify(stackedHome)).toBe(stackedHome.mainStrip)
  expect(stackedHome.titlebarSeam.borderRightStyle, JSON.stringify(stackedHome)).toBe('solid')
  expect(stackedHome.titlebarSeam.borderRightWidth, JSON.stringify(stackedHome)).toBe('1px')
  expect(stackedHome.titlebarSeam.boxShadow, JSON.stringify(stackedHome)).toBe('none')
  if (stackedHome.sessionsStrip && !stackedHome.glass) {
    expect(stackedHome.sessionsStrip, JSON.stringify(stackedHome)).not.toBe(stackedHome.titlebar)
  }

  // Glass must rebind the Aino aliases to the transparent chat/rail surfaces;
  // otherwise the default landing token (#fff / --dt-card) paints an opaque
  // band over the native material even though the regular chat token is clear.
  const originalGlass = await page.evaluate(() => document.documentElement.hasAttribute('data-hermes-glass'))
  await page.evaluate(() => document.documentElement.setAttribute('data-hermes-glass', ''))
  const glassHome = await topSurfaceMetrics()
  expect(glassHome.titlebar, JSON.stringify(glassHome)).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  expect(glassHome.mainStrip, JSON.stringify(glassHome)).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  await page.evaluate(glass => {
    document.documentElement.toggleAttribute('data-hermes-glass', glass)
  }, originalGlass)

  const composer = page.locator('[contenteditable="true"]').first()

  await composer.waitFor({ state: 'visible', timeout: 10_000 })
  await composer.click()
  await composer.type('Verify the top chrome surface contract', { delay: 10 })
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('mock inference server'), undefined, {
    timeout: 60_000
  })

  const conversation = await topSurfaceMetrics()

  if (conversation.mainStrip) {
    expect(conversation.titlebar, JSON.stringify(conversation)).toBe(conversation.mainStrip)
  }
  if (conversation.sessionsStrip && !conversation.glass) {
    expect(conversation.sessionsStrip, JSON.stringify(conversation)).not.toBe(conversation.titlebar)
  }
  expect(conversation.mainStrip, JSON.stringify(conversation)).not.toBeNull()
  expect(conversation.titlebar, JSON.stringify(conversation)).toBe(conversation.mainStrip)
  expect(conversation.titlebar, JSON.stringify({ home, stackedHome, conversation })).toBe(stackedHome.titlebar)
})
