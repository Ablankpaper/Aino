/** Regression coverage for the Aino top-chrome surface contract. */

import { type MockBackendFixture, setupMockBackend, waitForAppReady } from './fixtures'
import { expect, test } from './test'

let fixture: MockBackendFixture | null = null
const rendererErrors: string[] = []

test.beforeAll(async () => {
  fixture = await setupMockBackend({ extraConfig: 'desktop:\n  repo_scan_enabled: false\naccount:\n  dev_mode: true' })
  const { page } = fixture
  page.on('pageerror', error => rendererErrors.push(error.message))
  await page.getByRole('textbox', { name: 'Email or phone', exact: true }).fill('top-chrome@example.com')
  await page.getByRole('checkbox', { name: 'Agree to the user agreement and privacy policy', exact: true }).check()
  await page.getByRole('button', { name: 'Send code', exact: true }).click()
  await page.getByRole('textbox', { name: 'Verification code', exact: true }).fill('1234')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await waitForAppReady(fixture, 120_000)
})

test.afterAll(async () => {
  await fixture?.cleanup()
  fixture = null
})

test('keeps the primary conversation title beside search without a second header row', async () => {
  const testInfo = test.info()
  const { app, page } = fixture!
  const title = page.locator('[data-current-session-title]').first()
  await page.locator('[data-tour="sidebar-nav-new-session"]').click()
  await expect(page.locator('[data-chat-surface][data-home-layout]')).toBeVisible()
  await expect(page.locator('[data-window-session-title]')).toHaveCount(0)
  await expect(title).toHaveCount(0)

  const metrics = () =>
    page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector)

        if (!element) {
          throw new Error(`Missing header element: ${selector}`)
        }

        const { top, right, bottom, left, width } = element.getBoundingClientRect()

        return { top, right, bottom, left, width }
      }

      const bar = rect('[data-slot="app-titlebar"]')
      const content = rect('[data-titlebar-content]')
      const heading = document.querySelector('[data-current-session-title]')?.getBoundingClientRect()
      const chat = rect('[data-chat-surface]')
      const search = document.querySelector('[data-session-search-shell]')?.getBoundingClientRect()
      const tools = rect('[data-slot="titlebar-app-controls"]')
      const paneTools = document.querySelector('[data-slot="titlebar-pane-controls"]')?.getBoundingClientRect()
      const label = document.querySelector<HTMLElement>('[data-current-session-title] > span')

      return {
        chatStartsBelowBar: Math.abs(chat.top - bar.bottom) <= 1,
        titleInsideBar: !heading || (heading.top >= bar.top && heading.bottom <= bar.bottom),
        // Narrow windows deliberately ellipsize the title; its existing
        // overflow tooltip supplies the full name, without a fixed pixel floor.
        titleVisible: !heading || (heading.width > 0 && Boolean(label && label.clientWidth > 0)),
        titleBeforeSearch: !heading || !search || heading.right <= search.left,
        searchBeforeTools: !search || search.right <= (paneTools?.left ?? tools.left),
        searchCentered: !search || Math.abs((search.left + search.right) / 2 - (content.left + content.right) / 2) <= 2,
        titleTruncatesCleanly:
          !label || label.scrollWidth <= label.clientWidth || getComputedStyle(label).textOverflow === 'ellipsis',
        viewportOverflow: document.documentElement.scrollWidth > window.innerWidth
      }
    })

  await expect.poll(async () => (await metrics()).titleInsideBar).toBe(true)
  expect((await metrics()).chatStartsBelowBar).toBe(true)
  await expect(page.locator('[data-tree-tab="hermes-bots:pane"]')).toBeVisible()

  const composer = page.locator('[contenteditable="true"]').first()
  const unsentDraft = 'This draft must not appear as a conversation heading before it is sent'
  await composer.fill(unsentDraft)
  await expect
    .poll(() =>
      page.evaluate(expected => {
        const raw = localStorage.getItem('hermes:composer-drafts:v3')

        return raw ? Object.values(JSON.parse(raw) as Record<string, string>).includes(expected) : false
      }, unsentDraft)
    )
    .toBe(true)
  await expect(title).toHaveCount(0)
  await expect(page.locator('[data-window-session-title]')).toHaveCount(0)
  await expect.poll(async () => (await metrics()).searchCentered).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('unsent-draft-title.png') })
  await composer.fill('Check a long conversation heading while keeping search and every window tool available')
  await composer.press('Enter')
  await page.waitForFunction(() => document.body.textContent?.includes('mock inference server'), undefined, {
    timeout: 60_000
  })
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0)
  await expect(title).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Search sessions' })).toBeVisible()
  await expect(
    page.locator('[data-slot="app-titlebar"]').getByRole('button', { name: 'Session actions' })
  ).toBeVisible()

  const longTitle = 'Verify a deliberately long conversation title while keeping search and session actions available'
  await page.locator('[data-slot="app-titlebar"]').getByRole('button', { name: 'Session actions' }).click()
  await page.getByRole('menuitem', { name: /Rename/ }).click()
  const renameDialog = page.getByRole('dialog', { name: 'Rename session' })
  await renameDialog.getByRole('textbox').fill(longTitle)
  await renameDialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(renameDialog).toHaveCount(0)
  await expect(title).toHaveText(longTitle)
  const titleLabel = title.locator('[data-slot="pane-tab-label"]')
  expect(await titleLabel.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true)
  await titleLabel.hover()
  await expect(page.getByRole('tooltip')).toContainText(longTitle)
  await page.mouse.move(0, 100)
  await expect(page.getByRole('tooltip')).toHaveCount(0)

  for (const width of [1220, 760]) {
    await app.evaluate(({ BrowserWindow }, nextWidth) => {
      BrowserWindow.getAllWindows()[0].setSize(nextWidth, 800, false)
    }, width)
    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width)
    await expect.poll(metrics).toEqual({
      chatStartsBelowBar: true,
      titleInsideBar: true,
      titleVisible: true,
      titleBeforeSearch: true,
      searchBeforeTools: true,
      searchCentered: true,
      titleTruncatesCleanly: true,
      viewportOverflow: false
    })
    await page.screenshot({ path: testInfo.outputPath(`single-titlebar-${width}.png`) })
  }

  await page.getByRole('button', { name: 'Hide sidebar', exact: true }).click()
  await expect.poll(async () => (await metrics()).titleInsideBar).toBe(true)
  await expect(title).toBeVisible()
  await page.getByRole('button', { name: 'Show sidebar', exact: true }).click()
  await expect(page.locator('[data-aino-sidebar]')).toBeVisible()

  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1220, 800, false))
  const sessionUrl = page.url()
  const sessionTitle = await title.innerText()
  await page.locator('[data-aino-sidebar]').getByRole('button', { name: 'Open settings', exact: true }).click()
  await expect(page.locator('[data-settings-workspace]')).toBeVisible()
  await expect(page.locator('[data-window-session-title]')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Search sessions' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
  await expect(page).toHaveURL(sessionUrl)
  await expect(title).toHaveText(sessionTitle)
  await expect.poll(async () => (await metrics()).chatStartsBelowBar).toBe(true)

  await page.getByRole('button', { name: 'Swap sidebar sides', exact: true }).click()
  await expect.poll(async () => (await metrics()).titleInsideBar).toBe(true)
  await expect.poll(async () => (await metrics()).searchCentered).toBe(true)
  await expect(page.locator('[data-aino-sidebar]')).toBeVisible()
  await page.getByRole('button', { name: 'Swap sidebar sides', exact: true }).click()

  await page.locator('[data-slot="app-titlebar"]').getByRole('button', { name: 'Session actions' }).click()
  const windowOpened = app.waitForEvent('window')
  await page.getByRole('menuitem', { name: 'New window', exact: true }).click()
  const secondary = await windowOpened

  try {
    await expect(secondary).toHaveURL(/win=secondary/)
    await expect(secondary.locator('[data-current-session-title]').first()).toBeVisible({ timeout: 30_000 })
    await expect(secondary.locator('[data-window-session-title]')).toHaveCount(0)
    await expect(secondary.locator('[data-tree-group] [data-current-session-title]').first()).toBeVisible()
    await expect(secondary.locator('[data-chat-surface]').first()).toContainText('mock inference server', {
      timeout: 30_000
    })
  } finally {
    await secondary.close()
  }

  await page.locator('button:has-text("New session")').first().click()
  await expect(page.locator('[data-chat-surface][data-home-layout]')).toBeVisible()
  await expect(title).toHaveCount(0)
  const row = page.locator('[data-aino-sidebar]').getByRole('button', { name: sessionTitle, exact: true })
  // Opening history reveals its heading; that title remains a tab drop target.
  await row.click()
  await expect(title).toHaveText(sessionTitle)
  await row.dragTo(title)
  await expect(page.locator('[data-window-session-title]')).toContainText(sessionTitle)
  await expect(page.locator('[data-chat-surface]:visible').first()).toContainText('mock inference server')

  const targetUrl = page.url()
  await page.locator('[data-tour="sidebar-nav-new-session"]').click()
  await expect(title).toHaveCount(0)
  const search = page.getByRole('textbox', { name: 'Search sessions' })
  await search.fill('deliberately long conversation')
  const results = page.locator('[data-session-search-results]')
  await expect(results).toBeVisible()
  const resultRow = results.getByRole('button', { name: longTitle, exact: false }).first()
  await expect(resultRow).toBeVisible()
  await expect.poll(async () => (await metrics()).searchCentered).toBe(true)
  const resultBox = await results.boundingBox()
  const searchBox = await page.locator('[data-session-search-shell]').boundingBox()
  expect(resultBox!.y).toBeGreaterThanOrEqual(searchBox!.y + searchBox!.height)
  await page.screenshot({ path: testInfo.outputPath('centered-search-results.png') })
  await resultRow.click()
  await expect(page).toHaveURL(targetUrl)
  await expect(search).toHaveValue('')
  await expect(title).toHaveText(longTitle)
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(rendererErrors).toEqual([])
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
  // Reload restores the last stored chat, so establish this test's draft
  // explicitly instead of inheriting the previous test's session state.
  await page.locator('button:has-text("New session")').first().click()
  await expect(page.locator('[data-chat-surface][data-home-layout]')).toBeVisible()

  const stackedHome = await topSurfaceMetrics()

  expect(await page.locator('[data-chat-surface][data-home-layout]').count()).toBeGreaterThan(0)
  expect(stackedHome.mainStrip, JSON.stringify(stackedHome)).not.toBeNull()
  expect(stackedHome.titlebar, JSON.stringify(stackedHome)).toBe(stackedHome.mainStrip)
  expect(stackedHome.titlebarSeam.borderRightStyle, JSON.stringify(stackedHome)).toBe('solid')
  // The rail's edge continues through the titlebar as one quiet hairline.
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
