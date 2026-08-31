// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'

import FrameEmbedRenderer from './frame-embed'
import type { FrameEmbed } from './providers/types'

afterEach(cleanup)

describe('FrameEmbedRenderer localization', () => {
  it('uses Simplified Chinese for the generic iframe accessibility title', () => {
    const descriptor: FrameEmbed = {
      aspectRatio: 1.5,
      embedUrl: 'https://maps.example.test/embed',
      id: 'map-example',
      label: '地图服务',
      provider: 'googlemaps',
      renderer: 'frame',
      sourceUrl: 'https://maps.example.test'
    }

    const { container } = render(
      <I18nProvider configClient={null} initialLocale="zh">
        <FrameEmbedRenderer descriptor={descriptor} />
      </I18nProvider>
    )

    expect(container.querySelector('iframe')?.getAttribute('title')).toBe('地图服务 嵌入')
  })
})
