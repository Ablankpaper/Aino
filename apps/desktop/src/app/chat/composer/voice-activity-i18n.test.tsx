// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'
import { $voicePlayback } from '@/store/voice-playback'

import { VoicePlaybackActivity } from './voice-activity'

afterEach(() => {
  cleanup()
  $voicePlayback.set({
    audioElement: null,
    messageId: null,
    sequence: 0,
    source: null,
    status: 'idle'
  })
})

describe('voice playback localization', () => {
  it('uses the Simplified Chinese stop label', () => {
    $voicePlayback.set({
      audioElement: null,
      messageId: 'message-1',
      sequence: 1,
      source: 'read-aloud',
      status: 'speaking'
    })

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <VoicePlaybackActivity />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: '停止' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull()
  })
})
