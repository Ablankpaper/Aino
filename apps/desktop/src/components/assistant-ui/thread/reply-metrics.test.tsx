import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'

import { ReplyMetrics } from './reply-metrics'

afterEach(cleanup)

it('shows translated provider billing text only for an explicitly custom reply', () => {
  const view = render(
    <I18nProvider configClient={null} initialLocale="zh">
      <ReplyMetrics metrics={{ duration_s: 2, billing_source: 'custom_provider' }} />
    </I18nProvider>
  )

  expect(screen.getByText('费用由你的自定义服务商收取，不消耗 Aino 余额。')).toBeTruthy()

  view.rerender(
    <I18nProvider configClient={null} initialLocale="zh">
      <ReplyMetrics metrics={{ duration_s: 2 }} />
    </I18nProvider>
  )

  expect(screen.queryByText('费用由你的自定义服务商收取，不消耗 Aino 余额。')).toBeNull()
})
