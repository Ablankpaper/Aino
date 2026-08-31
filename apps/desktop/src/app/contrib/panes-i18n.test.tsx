// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as HermesApi from '@/hermes'
import { I18nProvider } from '@/i18n'

const { getLogs } = vi.hoisted(() => ({ getLogs: vi.fn() }))

vi.mock('@/hermes', async importOriginal => ({
  ...(await importOriginal<typeof HermesApi>()),
  getLogs
}))

import { LogsPane } from './panes'

afterEach(() => {
  vi.clearAllMocks()
})

describe('contribution logs localization', () => {
  it('localizes unavailable-log copy for Simplified Chinese users', async () => {
    getLogs.mockRejectedValue(new Error('connection lost'))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <QueryClientProvider client={queryClient}>
          <LogsPane />
        </QueryClientProvider>
      </I18nProvider>
    )

    await waitFor(() => expect(screen.getByText('日志暂不可用：Error: connection lost')).toBeTruthy())
    expect(screen.queryByText('log unavailable: Error: connection lost')).toBeNull()
    queryClient.clear()
  })
})
