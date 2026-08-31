import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'

import { ComboboxInput } from './combobox-input'

afterEach(cleanup)

describe('ComboboxInput localization', () => {
  it('uses the Simplified Chinese accessible label for its options button', () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <ComboboxInput onChange={() => {}} options={['voice-a']} value="" />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: '显示选项' })).toBeTruthy()
  })
})
