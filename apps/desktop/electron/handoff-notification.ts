import type { MessageBoxOptions } from 'electron'

import type { HandoffResult } from './handoff-result'

interface HandoffNotificationWindow {
  isDestroyed(): boolean
  isVisible(): boolean
  once(event: 'show' | 'closed', listener: () => void): unknown
  removeListener(event: 'show' | 'closed', listener: () => void): unknown
}

interface HandoffNotificationOptions<Window extends HandoffNotificationWindow> {
  window: Window | null
  appName: string
  logPath: string
  log(message: string): void
  showMessageBox(parent: Window, options: MessageBoxOptions): Promise<unknown>
}

export function notifyHandoffResult<Window extends HandoffNotificationWindow>(
  result: HandoffResult | null,
  { window, appName, logPath, log, showMessageBox }: HandoffNotificationOptions<Window>
): void {
  if (!result) {
    return
  }

  if (result.ok && !result.manual) {
    log(`[updates] detached update finished OK (branch ${result.branch})`)

    return
  }

  log(
    result.ok
      ? `[updates] detached update finished with manual action (branch ${result.branch}): ${result.message}`
      : `[updates] detached update FAILED (exit ${result.exitCode}): ${result.message}`
  )

  if (!window || window.isDestroyed()) {
    return
  }

  const notice: MessageBoxOptions = result.ok
    ? {
        type: 'warning',
        title: `${appName} update`,
        message: 'The update finished, but needs one more step',
        detail: result.message
      }
    : {
        type: 'error',
        title: `${appName} update did not finish`,
        message: `${appName} update did not finish`,
        detail: `${result.message}\n\nDetails: ${logPath}`
      }

  const clearPending = () => {
    window.removeListener('show', show)
    window.removeListener('closed', clearPending)
  }

  const show = async () => {
    clearPending()

    if (window.isDestroyed()) {
      return
    }

    try {
      await showMessageBox(window, notice)
    } catch (error) {
      log(`[updates] could not show update result: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // On macOS even the Promise API runs a blocking NSAlert without a parent.
  // Wait for the hidden boot window to appear, then use its asynchronous sheet.
  if (window.isVisible()) {
    void show()
  } else {
    window.once('show', show)
    window.once('closed', clearPending)
  }
}
