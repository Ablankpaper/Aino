import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'

import { PanelRowMenu } from './panel'

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.setPointerCapture ??= () => undefined
  HTMLElement.prototype.scrollIntoView ??= () => undefined
})

describe('PanelRowMenu', () => {
  afterEach(() => {
    cleanup()
  })

  it('opens its actions menu from the kebab without a tooltip', async () => {
    const onSelect = vi.fn()

    render(<PanelRowMenu items={[{ label: 'Rename', onSelect }]} />)

    const trigger = screen.getByRole('button', { name: 'Actions' })

    expect(trigger.closest('[data-slot="tooltip-trigger"]')).toBeNull()

    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }))

    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('uses the active locale for the default actions label', () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <PanelRowMenu items={[{ label: '重命名', onSelect: vi.fn() }]} />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: '操作' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Actions' })).toBeNull()
  })
})
