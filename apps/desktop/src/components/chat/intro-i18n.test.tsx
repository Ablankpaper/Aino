// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'

import { Intro } from './intro'

afterEach(() => {
  cleanup()
})

describe('empty chat intro localization', () => {
  it('renders Simplified Chinese copy for a Chinese locale', () => {
    const { container } = render(
      <I18nProvider configClient={null} initialLocale="zh">
        <Intro personality="none" seed={0} />
      </I18nProvider>
    )

    const text = container.textContent ?? ''

    expect(text).toMatch(/[\u4e00-\u9fff]/u)
    expect(text).not.toMatch(/Ask a question|Describe the task|Drop a file|Search the repo|Type a task/u)
  })
})
