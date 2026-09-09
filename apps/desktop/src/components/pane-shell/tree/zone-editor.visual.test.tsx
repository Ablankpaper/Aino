import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'

import { $zoneEditorOpen, ZoneEditor } from './zone-editor'

describe('ZoneEditor visual contracts', () => {
  beforeEach(() => {
    $zoneEditorOpen.set(true)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
  })

  afterEach(() => {
    cleanup()
    $zoneEditorOpen.set(false)
    vi.restoreAllMocks()
  })

  it('keeps the merge affordance on the shared button surface', () => {
    render(
      <I18nProvider configClient={null} initialLocale="en">
        <ZoneEditor />
      </I18nProvider>
    )

    const canvas = globalThis.document.querySelector('.cursor-crosshair') as HTMLDivElement
    expect(canvas).toBeTruthy()

    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      toJSON: () => ({}),
      top: 0,
      width: 100,
      x: 0,
      y: 0
    })

    fireEvent.pointerDown(canvas, { button: 0, clientX: 5, clientY: 5 })
    fireEvent.pointerMove(window, { clientX: 95, clientY: 95 })
    fireEvent.pointerUp(window, { clientX: 95, clientY: 95 })

    const buttons = [...globalThis.document.querySelectorAll('button')]
    const affordance = buttons.find(button => button.textContent?.includes('Merge'))

    expect(affordance).toBeTruthy()
    expect(affordance!.className).not.toContain('shadow-lg')

    fireEvent.click(affordance!)

    expect(
      [...globalThis.document.querySelectorAll('button')].find(button => button.textContent?.includes('Merge'))
    ).toBeUndefined()
  })
})
