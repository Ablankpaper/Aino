import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'

import { EmbedFail } from './fail'

afterEach(cleanup)

describe('EmbedFail localization', () => {
  it('renders the failure message in Simplified Chinese', () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <EmbedFail label="YouTube" />
      </I18nProvider>
    )

    expect(screen.getByText('加载 YouTube 嵌入失败')).toBeTruthy()
  })
})
