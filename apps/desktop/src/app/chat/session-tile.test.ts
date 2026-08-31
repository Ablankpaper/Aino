import { describe, expect, it } from 'vitest'

import { setRuntimeI18nLocale } from '@/i18n'

import { sessionTileResumeFailure } from './session-tile'

describe('sessionTileResumeFailure', () => {
  it('keeps a confirmed durable session retryable instead of repeating a stale 404', () => {
    expect(sessionTileResumeFailure('session not found', true, true)).toBe(
      'Session is still available — retry resuming it.'
    )
  })

  it('fails safe on an inconclusive durable lookup', () => {
    expect(sessionTileResumeFailure('404', false, true)).toBe('Session unavailable — you can retry resuming it.')
  })

  it('does not overwrite a tile that rebound while the lookup was pending', () => {
    expect(sessionTileResumeFailure('session not found', true, false)).toBeUndefined()
  })

  it('uses the active locale for retry guidance', () => {
    setRuntimeI18nLocale('zh')

    expect(sessionTileResumeFailure('session not found', true, true)).toBe('会话仍然可用，请重试恢复。')
    expect(sessionTileResumeFailure('404', false, true)).toBe('会话不可用，你可以重试恢复。')

    setRuntimeI18nLocale('en')
  })
})
