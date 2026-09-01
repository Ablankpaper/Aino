import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setRuntimeI18nLocale } from '@/i18n'
import { $gateway } from '@/store/gateway'

import { requestOneShot } from './oneshot'

describe('requestOneShot', () => {
  beforeEach(() => {
    setRuntimeI18nLocale('zh')
    $gateway.set(null)
  })

  afterEach(() => {
    setRuntimeI18nLocale('en')
    $gateway.set(null)
  })

  it('localizes the disconnected-gateway error for Simplified Chinese users', async () => {
    await expect(requestOneShot({ input: 'draft a commit message' })).rejects.toThrow('Aino 网关未连接')
  })
})
