import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'

import { EmbedFacade } from './embed-consent'
import type { EmbedDescriptor } from './providers/types'

const descriptor: EmbedDescriptor = {
  embedUrl: 'https://www.youtube.com/embed/example',
  id: 'youtube-example',
  label: 'YouTube',
  provider: 'youtube',
  renderer: 'frame',
  sourceUrl: 'https://www.youtube.com/watch?v=example'
}

beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, () => unknown>

  const stubs: Record<string, () => unknown> = {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
    setPointerCapture: () => undefined
  }

  for (const [name, fn] of Object.entries(stubs)) {
    proto[name] ??= fn
  }
})

afterEach(cleanup)

describe('EmbedFacade localization', () => {
  it('renders translated consent actions while keeping the provider label intact', async () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <EmbedFacade descriptor={descriptor} onLoad={() => {}} />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: '加载 YouTube' })).toBeTruthy()

    fireEvent.keyDown(screen.getByRole('button', { name: '更多操作' }), { key: 'Enter' })

    expect(await screen.findByRole('menuitem', { name: '始终允许 YouTube' })).toBeTruthy()
  })
})
