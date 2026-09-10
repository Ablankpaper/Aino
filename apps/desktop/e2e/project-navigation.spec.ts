import { mkdirSync, realpathSync } from 'node:fs'
import * as path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { type MockBackendFixture, setupMockBackend, waitForAppReady } from './fixtures'
import { expect, test } from './test'

let fixture: MockBackendFixture
const rendererErrors: string[] = []

test.beforeAll(async () => {
  fixture = await setupMockBackend({ extraConfig: 'desktop:\n  repo_scan_enabled: false' })
  fixture.page.on('pageerror', error => rendererErrors.push(error.message))
  await waitForAppReady(fixture, 120_000)
})

test.afterAll(async () => {
  await fixture?.cleanup()
})

function storedSessions(): Array<{ id: string; cwd: string | null }> {
  const db = new DatabaseSync(path.join(fixture.sandbox.hermesHome, 'state.db'), { readOnly: true })
  try {
    return db.prepare('SELECT id, cwd FROM sessions').all() as Array<{ id: string; cwd: string | null }>
  } finally {
    db.close()
  }
}

async function pickFolder(folder: string | null) {
  // Only replace the OS chooser; project persistence and session creation use
  // the real Electron bridge and backend, with isolated data and mock inference.
  await fixture.app.evaluate(({ dialog }, folder) => {
    dialog.showOpenDialog = async () => ({ canceled: folder === null, filePaths: folder ? [folder] : [] })
  }, folder)
}

async function sendMessage(text: string) {
  const { page } = fixture
  const before = new Set(storedSessions().map(row => row.id))
  const composer = page.locator('[contenteditable="true"]:visible').last()
  await expect(composer).toBeVisible()
  await composer.fill(text)
  await composer.press('Enter')
  await expect(
    page.locator('[data-chat-surface]:visible').getByText(/Hello from the mock inference server/)
  ).toBeVisible({
    timeout: 60_000
  })
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0)
  await expect.poll(() => storedSessions().filter(row => !before.has(row.id)).length).toBe(1)
  await expect(composer).toBeVisible()
  return storedSessions().find(row => !before.has(row.id))!
}

test('separates pinned, project and ordinary chats through real folder and session workflows', async ({}, testInfo) => {
  test.setTimeout(180_000)
  const { page, sandbox } = fixture
  const sidebar = page.locator('[data-aino-sidebar]')
  const projects = sidebar.getByRole('button', { name: 'Projects', exact: true })
  const recents = sidebar.getByRole('button', { name: 'Recent', exact: true })
  const openFolder = sidebar.getByRole('button', { name: 'Open folder as project…', exact: true })
  const plainNew = sidebar.locator('[data-sidebar="menu-button"]:has([data-tour="sidebar-nav-new-session"])')
  const recentSection = sidebar
    .locator('[data-sidebar-section]')
    .filter({ has: page.getByRole('button', { name: 'Recent', exact: true }) })
  const projectSection = sidebar
    .locator('[data-sidebar-section]')
    .filter({ has: page.getByRole('button', { name: 'Projects', exact: true }) })
  const row = (text: string) => sidebar.locator('[data-sidebar-session-row]').filter({ hasText: text })

  await expect(projects).toBeVisible()
  await expect(recents).toBeVisible()
  await expect(sidebar.getByRole('button', { name: 'Pinned', exact: true })).toHaveCount(0)
  if ((await projects.getAttribute('aria-expanded')) === 'true') await projects.click()
  await expect(openFolder).toBeVisible()
  await pickFolder(null)
  await openFolder.click()
  await expect(openFolder).toBeEnabled()
  await expect(projects).toHaveAttribute('aria-expanded', 'false')
  if ((await recents.getAttribute('aria-expanded')) !== 'true') await recents.click()

  const folder = path.join(realpathSync(sandbox.root), 'sample-app')
  mkdirSync(folder)
  await pickFolder(folder)
  await openFolder.click()
  await expect(projects).toHaveAttribute('aria-expanded', 'true')
  await expect(sidebar.getByRole('button', { name: 'New session in sample-app', exact: true }).first()).toBeVisible()
  const projectChat = await sendMessage('Project conversation')
  expect(projectChat.cwd).toBe(folder)
  await expect(projectSection.getByText('Project conversation', { exact: true })).toBeVisible()
  await expect(recentSection.getByText('Project conversation', { exact: true })).toHaveCount(0)

  await plainNew.click()
  const ordinaryChat = await sendMessage('Ordinary conversation')
  expect(ordinaryChat.cwd).toBeNull()
  await expect(recentSection.getByText('Ordinary conversation', { exact: true })).toBeVisible()
  await expect(projectSection.getByText('Ordinary conversation', { exact: true })).toHaveCount(0)

  await row('Project conversation').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Pin', exact: true }).click()
  await expect(sidebar.getByRole('button', { name: 'Pinned', exact: true })).toBeVisible()
  await expect(row('Project conversation')).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('project-navigation-pinned.png') })
  await row('Project conversation').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Unpin', exact: true }).click()
  await expect(sidebar.getByRole('button', { name: 'Pinned', exact: true })).toHaveCount(0)
  await expect(row('Project conversation')).toHaveCount(1)

  await openFolder.click()
  await expect(sidebar.getByRole('button', { name: 'New session in sample-app', exact: true }).first()).toBeVisible()
  await plainNew.click()
  await expect(sidebar.getByRole('button', { name: 'Open sample-app', exact: true })).toHaveCount(1)

  const createdFolder = path.join(realpathSync(sandbox.root), 'created-project')
  mkdirSync(createdFolder)
  await pickFolder(createdFolder)
  await sidebar.getByRole('button', { name: 'New project', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'New project', exact: true })
  await dialog.getByPlaceholder('e.g. Skunkworks').fill('Created project')
  await dialog.getByRole('button', { name: 'Add folder', exact: true }).click()
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(
    sidebar.getByRole('button', { name: 'New session in Created project', exact: true }).first()
  ).toBeVisible()
  const createdChat = await sendMessage('Created project conversation')
  expect(createdChat.cwd).toBe(createdFolder)
  await plainNew.click()
  await expect(sidebar.getByRole('button', { name: 'Open Created project', exact: true })).toBeVisible()

  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(rendererErrors).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('project-navigation-desktop.png') })
})

test('keeps project entry points and composer usable at a narrow desktop width', async ({}, testInfo) => {
  const { page, app } = fixture
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(760, 800, false))
    const actions = page.locator('[data-project-section-actions]')
    const sidebar = page.locator('[data-aino-sidebar]')
    await expect(actions.getByRole('button', { name: 'New project', exact: true })).toBeVisible()
    await expect(actions.getByRole('button', { name: 'Open folder as project…', exact: true })).toBeVisible()
    const actionsBox = await actions.boundingBox()
    const sidebarBox = await sidebar.boundingBox()
    expect(actionsBox!.x + actionsBox!.width).toBeLessThanOrEqual(sidebarBox!.x + sidebarBox!.width)
    await expect(page.locator('[contenteditable="true"]:visible').last()).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('project-navigation-narrow.png') })
    expect(rendererErrors).toEqual([])
  } finally {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1220, 800, false))
  }
})
