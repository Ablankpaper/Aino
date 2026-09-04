/**
 * E2E chat tests — send a message and verify a response appears.
 *
 * Requires the full boot chain to complete (hermes serve + mock inference
 * provider). The mock server returns a canned reply, so we verify the
 * response text shows up in the chat transcript.
 *
 * Prerequisite: `npm run build` must have been run so dist/ exists.
 */

import { expect, test } from './test'

import { type MockBackendFixture, setupMockBackend, waitForAppReady } from './fixtures'
import { BLOCKING_CLARIFY_QUESTION, BLOCKING_CLARIFY_TRIGGER } from './mock-server'
import { expectVisualSnapshot } from './visual-snapshot'

let fixture: MockBackendFixture | null = null

test.beforeAll(async () => {
  fixture = await setupMockBackend()
  await waitForAppReady(fixture!, 120_000)
})

test.afterAll(async () => {
  await fixture?.cleanup()
  fixture = null
})

test.describe('chat interaction with mock backend', () => {
  test('aligns the live composer with its home layout slot', async () => {
    const page = fixture!.page
    const surface = page.locator('[data-chat-surface][data-home-layout]').first()
    const composer = surface.locator('[data-slot="composer-surface"]')

    await expect(surface).toBeVisible()
    await expect(composer).toBeVisible()

    const metrics = await surface.evaluate(node => {
      const dock = node.querySelector<HTMLElement>('[data-slot="composer-dock"]')
      const slot = node.querySelector<HTMLElement>('.aino-home-composer-slot')

      if (!dock || !slot) {
        throw new Error('Home layout did not render its composer dock and reserved slot')
      }

      const dockRect = dock.getBoundingClientRect()
      const slotRect = slot.getBoundingClientRect()
      const hitTarget = document.elementFromPoint(dockRect.left + dockRect.width / 2, dockRect.top + dockRect.height / 2)

      return {
        leftDelta: Math.abs(dockRect.left + 5 - slotRect.left),
        pointerInteractive: Boolean(hitTarget && dock.contains(hitTarget)),
        topDelta: Math.abs(dockRect.top - slotRect.top),
        visibleSurfaceWidth: dockRect.width - 10,
        slotWidth: slotRect.width
      }
    })

    expect(metrics.topDelta, JSON.stringify(metrics)).toBeLessThanOrEqual(1)
    expect(metrics.leftDelta, JSON.stringify(metrics)).toBeLessThanOrEqual(1)
    expect(Math.abs(metrics.visibleSurfaceWidth - metrics.slotWidth), JSON.stringify(metrics)).toBeLessThanOrEqual(1)
    expect(metrics.pointerInteractive, JSON.stringify(metrics)).toBe(true)
  })

  test('send a message and receive a response', async () => {
    const page = fixture!.page

    // Find the composer — it's a contenteditable textbox.
    const composer = page.locator('[contenteditable="true"]').first()
    await composer.waitFor({ state: 'visible', timeout: 10_000 })

    // Click to focus, then type the message character by character.
    // Using `type` instead of `fill` because the composer is a
    // contenteditable div with custom keydown handling that tracks
    // IME composition state — `fill` bypasses the event chain.
    await composer.click()
    await composer.type('Hello, can you hear me?', { delay: 20 })

    // Submit with Enter — the composer's keydown handler intercepts
    // plain Enter (without Shift) and calls submitDraft().
    await page.keyboard.press('Enter')

    // Wait for the user's message to appear in the transcript.
    // The message renders as an assistant-ui message in the chat view.
    await page.waitForFunction(
      () => {
        const body = document.body

        if (!body) {
          return false
        }

        return (body.textContent ?? '').includes('Hello, can you hear me?')
      },
      undefined,
      { timeout: 15_000 }
    )

    // Wait for the mock response to appear. The canned reply is:
    // "Hello from the mock inference server! The full boot chain is working."
    // Give it a generous timeout — the inference request goes through the
    // gateway → hermes serve → mock server → streaming SSE back.
    await page.waitForFunction(
      () => {
        const body = document.body

        if (!body) {
          return false
        }

        const text = body.textContent ?? ''

        return text.includes('mock inference server') || text.includes('boot chain is working')
      },
      undefined,
      { timeout: 60_000 }
    )
  })

  test('keeps the composer docked and uses the focused conversation layout after send', async () => {
    const page = fixture!.page
    const surface = page.locator('[data-chat-surface]').first()
    const composer = surface.locator('[data-slot="composer-surface"]')
    const userBubble = surface.locator('[data-slot="aui_user-bubble-actions"] button').first()
    const assistantContent = surface.locator('[data-slot="aui_assistant-message-content"]').first()
    const userActionRow = surface.locator('[data-slot="aui_user-actions-row"]').first()

    await expect(surface).toHaveAttribute('data-conversation-layout', '')
    await expect(composer).toBeVisible()
    await expect(userBubble).toBeVisible()
    await expect(assistantContent).toBeVisible()
    await expect(userActionRow).toBeVisible()
    await expect(userActionRow.getByRole('button', { name: 'Copy' })).toBeVisible()
    await expect(userActionRow.getByRole('button', { name: 'Edit message' })).toBeVisible()
    await expect(userActionRow.getByRole('button', { name: 'Restore checkpoint' })).toBeVisible()

    const metrics = await surface.evaluate(node => {
      const composerNode = node.querySelector<HTMLElement>('[data-slot="composer-surface"]')
      const composerBounds = node.querySelector<HTMLElement>('[data-slot="composer-bounds"]')
      const composerDock = node.querySelector<HTMLElement>('[data-slot="composer-dock"]')
      const userNode = node.querySelector<HTMLElement>('[data-slot="aui_user-bubble-actions"] button')
      const userBubbleNode = node.querySelector<HTMLElement>('[data-slot="aui_user-bubble"]')
      const userActionsNode = node.querySelector<HTMLElement>('[data-slot="aui_user-actions-row"]')
      const assistantNode = node.querySelector<HTMLElement>('[data-slot="aui_assistant-message-content"]')
      const firstAssistantAction = node.querySelector<HTMLElement>('[data-slot="aui_msg-actions"] button')

      if (
        !composerNode ||
        !composerBounds ||
        !composerDock ||
        !userNode ||
        !userBubbleNode ||
        !userActionsNode ||
        !assistantNode ||
        !firstAssistantAction
      ) {
        throw new Error('Conversation layout did not render its composer and message surfaces')
      }

      const surfaceRect = node.getBoundingClientRect()
      const boundsRect = composerBounds.getBoundingClientRect()
      const dockRect = composerDock.getBoundingClientRect()
      const composerRect = composerNode.getBoundingClientRect()
      const userRect = userNode.getBoundingClientRect()
      const userBubbleRect = userBubbleNode.getBoundingClientRect()
      const userActionsRect = userActionsNode.getBoundingClientRect()
      const assistantRect = assistantNode.getBoundingClientRect()
      const actionRect = firstAssistantAction.getBoundingClientRect()
      const composerHitTarget = document.elementFromPoint(
        composerRect.left + composerRect.width / 2,
        composerRect.top + composerRect.height / 2
      )

      return {
        actionLeft: actionRect.left,
        assistantLeft: assistantRect.left,
        boundsBottom: boundsRect.bottom,
        composerBottomGap: surfaceRect.bottom - composerRect.bottom,
        composerCenterDelta: Math.abs(
          composerRect.left + composerRect.width / 2 - (surfaceRect.left + surfaceRect.width / 2)
        ),
        composerLeft: composerRect.left,
        composerReceivesPointer: Boolean(composerHitTarget && composerNode.contains(composerHitTarget)),
        composerWidth: composerRect.width,
        dockPosition: getComputedStyle(composerDock).position,
        dockTop: dockRect.top,
        surfaceWidth: surfaceRect.width,
        userActionsBelowBubble: userActionsRect.top >= userBubbleRect.bottom,
        userActionsRightGap: Math.abs(userActionsRect.right - userBubbleRect.right),
        userRightGap: composerRect.right - userRect.right,
        userWidth: userRect.width
      }
    })

    expect(metrics.composerBottomGap, JSON.stringify(metrics)).toBeGreaterThanOrEqual(0)
    expect(metrics.composerBottomGap, JSON.stringify(metrics)).toBeLessThanOrEqual(32)
    expect(metrics.composerCenterDelta, JSON.stringify(metrics)).toBeLessThanOrEqual(1)
    expect(metrics.composerReceivesPointer, JSON.stringify(metrics)).toBe(true)
    expect(metrics.dockPosition, JSON.stringify(metrics)).toBe('relative')
    expect(Math.abs(metrics.boundsBottom - metrics.dockTop), JSON.stringify(metrics)).toBeLessThanOrEqual(1)
    expect(metrics.composerWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(800)
    expect(metrics.composerWidth, JSON.stringify(metrics)).toBeLessThan(metrics.surfaceWidth - 64)
    expect(metrics.userWidth, JSON.stringify(metrics)).toBeLessThan(metrics.composerWidth * 0.8)
    expect(Math.abs(metrics.userRightGap), JSON.stringify(metrics)).toBeLessThanOrEqual(1)
    expect(metrics.userActionsBelowBubble, JSON.stringify(metrics)).toBe(true)
    expect(metrics.userActionsRightGap, JSON.stringify(metrics)).toBeLessThanOrEqual(1)
    expect(Math.abs(metrics.assistantLeft - metrics.composerLeft), JSON.stringify(metrics)).toBeLessThanOrEqual(24)
    expect(Math.abs(metrics.actionLeft - metrics.assistantLeft), JSON.stringify(metrics)).toBeLessThanOrEqual(24)
  })

  test('screenshot of chat with messages', async () => {
    await expectVisualSnapshot(fixture!.page, { name: 'chat-with-messages', app: fixture!.app })
  })

  test('offers stop, send-to-steer, and queue actions while busy', async ({}, testInfo) => {
    const page = fixture!.page
    const composer = page.locator('[contenteditable="true"]').first()
    const primary = page.locator('[data-slot="composer-root"] button[type="submit"]')
    const queue = page.locator('[data-slot="composer-root"] button[aria-label="Queue message"]')
    const dictation = page.locator('[data-slot="composer-root"] button[aria-label="Voice dictation"]')
    const speakReplies = page.locator(
      '[data-slot="composer-root"] button[aria-label="Read replies aloud"], [data-slot="composer-root"] button[aria-label="Stop reading replies aloud"]'
    )

    await composer.click()
    await composer.type(BLOCKING_CLARIFY_TRIGGER)
    await page.keyboard.press('Enter')
    await page.getByText(BLOCKING_CLARIFY_QUESTION).waitFor({ state: 'visible', timeout: 30_000 })

    await expect(primary).toHaveAttribute('aria-label', 'Stop')
    await expect(primary.locator('span')).toHaveClass(/bg-current/)

    await composer.click()
    await composer.type('please answer tersely')
    // A mid-turn correction intentionally keeps the familiar Send label and
    // arrow; submitDraft routes that payload through the steer path. Queue is
    // the adjacent secondary action.
    await expect(primary).toHaveAttribute('aria-label', 'Send')
    await expect(dictation).toBeVisible()
    await expect(speakReplies).toBeVisible()
    await expect(queue).toBeVisible()
    await expect(queue.locator('svg.tabler-icon-layers-intersect-2')).toBeVisible()
    const controlLabels = await page
      .locator('[data-slot="composer-root"] button')
      .evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')))
    const speakRepliesIndex = controlLabels.findIndex(
      label => label === 'Read replies aloud' || label === 'Stop reading replies aloud'
    )
    expect(controlLabels.indexOf('Voice dictation')).toBeLessThan(speakRepliesIndex)
    expect(speakRepliesIndex).toBeLessThan(controlLabels.indexOf('Queue message'))
    expect(controlLabels.indexOf('Queue message')).toBeLessThan(controlLabels.lastIndexOf('Send'))
    await page.screenshot({ path: testInfo.outputPath('busy-composer-send-to-steer.png') })
    await expect(primary.locator('.codicon-arrow-up')).toBeVisible()

    await queue.click()
    await expect(primary).toHaveAttribute('aria-label', 'Stop')
    await expect(queue).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath('busy-composer-queue.png') })
    await expect(page.getByText('1 Queued')).toBeVisible()

    await primary.click()
    await expect(page.getByText('1 Queued — paused')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('busy-composer-queue-paused.png') })
  })
})
