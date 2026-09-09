import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setRuntimeI18nLocale } from '@/i18n'
import { $gateway } from '@/store/gateway'
import { $activeSessionId, $yoloActive } from '@/store/session'

import { setYoloEnabled } from './yolo-session'

describe('setYoloEnabled', () => {
  beforeEach(() => {
    setRuntimeI18nLocale('zh')
    $activeSessionId.set('session-1')
    $gateway.set(null)
    $yoloActive.set(false)
  })

  afterEach(() => {
    setRuntimeI18nLocale('en')
    $activeSessionId.set(null)
    $gateway.set(null)
    $yoloActive.set(false)
  })

  it('localizes the unavailable gateway error for Simplified Chinese users', async () => {
    await expect(setYoloEnabled(true)).rejects.toThrow('Aino 网关未连接')
  })
})
