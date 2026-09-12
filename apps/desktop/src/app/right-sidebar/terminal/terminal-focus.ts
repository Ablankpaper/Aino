/** Whether keyboard navigation currently owns focus in a terminal tab. */
export function terminalTabOwnsKeyboardFocus(): boolean {
  const active = document.activeElement

  if (
    !(active instanceof HTMLElement) ||
    active.getAttribute('role') !== 'tab' ||
    active.closest('[data-terminal-tabs]') === null
  ) {
    return false
  }

  try {
    return active.matches(':focus-visible')
  } catch {
    return false
  }
}

/** Give an activated terminal focus unless the tab strip is still keyboard-owned. */
export function focusTerminalForActivation(term: { focus: () => void }): void {
  if (!terminalTabOwnsKeyboardFocus()) {
    term.focus()
  }
}
