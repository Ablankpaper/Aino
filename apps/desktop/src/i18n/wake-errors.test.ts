import { describe, expect, it } from 'vitest'

import { en } from './en'
import { localizedWakeCaptureError } from './wake-errors'
import { zh } from './zh'

describe('localizedWakeCaptureError', () => {
  it('uses the localized microphone message for fixed browser capability errors', () => {
    expect(localizedWakeCaptureError(zh, new Error('AudioContext unavailable for client wake capture'))).toBe(
      '无法打开用于唤醒词的客户端麦克风'
    )
    expect(localizedWakeCaptureError(zh, 'getUserMedia unavailable for client wake capture')).toBe(
      '无法打开用于唤醒词的客户端麦克风'
    )
  })

  it('keeps unknown diagnostics intact and preserves the English contract', () => {
    expect(localizedWakeCaptureError(zh, new Error('NotAllowedError: permission denied'))).toBe(
      'NotAllowedError: permission denied'
    )
    expect(localizedWakeCaptureError(en, new Error('AudioContext unavailable for client wake capture'))).toBe(
      'Failed to open the client microphone for wake word'
    )
  })
})
