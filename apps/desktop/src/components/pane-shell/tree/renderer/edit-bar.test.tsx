import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'

import { $layoutEditMode } from '../../edit-mode'

import { TreeEditBar } from './edit-bar'

describe('TreeEditBar', () => {
  beforeEach(() => {
    $layoutEditMode.set(true)
  })

  afterEach(() => {
    cleanup()
    $layoutEditMode.set(false)
  })

  it('uses the shared Aino floating-surface contract', () => {
    render(
      <I18nProvider configClient={null} initialLocale="en">
        <TreeEditBar />
      </I18nProvider>
    )

    const card = globalThis.document.querySelector('h2')?.parentElement?.parentElement?.parentElement

    expect(card).toBeTruthy()
    expect(card!.className).toContain('rounded-(--aino-radius-panel)')
    expect(card!.className).toContain('border-(--stroke-nous)')
    expect(card!.className).toContain('shadow-nous')
    expect(card!.className).not.toContain('shadow-2xl')
    expect(card!.className).not.toContain('rounded-xl')
    expect(card!.className).not.toContain('border-(--ui-stroke-secondary)')
  })
})
