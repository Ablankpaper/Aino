// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'
import type * as MediaApi from '@/lib/media'

const { resolveMediaDisplaySrc } = vi.hoisted(() => ({ resolveMediaDisplaySrc: vi.fn() }))

vi.mock('@/lib/media', async importOriginal => ({
  ...(await importOriginal<typeof MediaApi>()),
  resolveMediaDisplaySrc
}))

import { MarkdownImage } from './markdown-text'

afterEach(() => {
  cleanup()
  resolveMediaDisplaySrc.mockReset()
})

describe('markdown media localization', () => {
  it('localizes image loading and retry copy for Simplified Chinese users', async () => {
    resolveMediaDisplaySrc.mockRejectedValue(new Error('unreadable'))

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <MarkdownImage alt="report.png" src="/tmp/report.png" />
      </I18nProvider>
    )

    await waitFor(() => expect(screen.getByRole('button', { name: '打开图片' })).toBeTruthy())
    expect(screen.getByText('图片加载失败：report.png。')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Open image' })).toBeNull()
  })
})
