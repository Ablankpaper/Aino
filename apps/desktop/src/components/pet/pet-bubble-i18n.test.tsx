// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'
import { $petActivity } from '@/store/pet'

import { PetBubble } from './pet-bubble'

afterEach(() => {
  cleanup()
  $petActivity.set({})
})

describe('pet bubble localization', () => {
  it('renders translated activity copy for Simplified Chinese users', () => {
    $petActivity.set({ busy: true })

    const { container } = render(
      <I18nProvider configClient={null} initialLocale="zh">
        <PetBubble />
      </I18nProvider>
    )

    const text = container.textContent ?? ''

    expect(text).toMatch(/[\u4e00-\u9fff]/u)
    expect(['working…', 'on it…', 'crunching…', 'tinkering…', 'cooking…']).not.toContain(text)
  })
})
