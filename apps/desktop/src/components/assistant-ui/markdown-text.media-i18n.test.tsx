// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'
import type * as MediaApi from '@/lib/media'

const { resolveMediaPlaybackSrc } = vi.hoisted(() => ({ resolveMediaPlaybackSrc: vi.fn() }))

vi.mock('@/lib/media', async importOriginal => ({
  ...(await importOriginal<typeof MediaApi>()),
  resolveMediaPlaybackSrc
}))

import { MarkdownImage } from './markdown-text'

afterEach(() => {
  cleanup()
  resolveMediaPlaybackSrc.mockReset()
})

describe('markdown audio/video fallback localization', () => {
  it('localizes the loading state for a media attachment', () => {
    resolveMediaPlaybackSrc.mockReturnValue(new Promise(() => {}))

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <MarkdownImage alt="clip.mp4" src="/tmp/clip.mp4" />
      </I18nProvider>
    )

    expect(screen.getByText('正在加载 clip.mp4…')).toBeTruthy()
    expect(screen.queryByText('Loading clip.mp4...')).toBeNull()
  })

  it('localizes the retry action after a media attachment fails', async () => {
    resolveMediaPlaybackSrc.mockRejectedValue(new Error('unreadable'))

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <MarkdownImage alt="clip.mp4" src="/tmp/clip.mp4" />
      </I18nProvider>
    )

    await waitFor(() => expect(screen.getByRole('link', { name: '打开 clip.mp4' })).toBeTruthy())
    expect(screen.queryByRole('link', { name: 'Open clip.mp4' })).toBeNull()
  })
})
