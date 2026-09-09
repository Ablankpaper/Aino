import { afterEach, describe, expect, it } from 'vitest'

import { setRuntimeI18nLocale } from '@/i18n'

import { HermesGateway } from './client'

afterEach(() => {
  setRuntimeI18nLocale('en')
})

describe('HermesGateway transport errors', () => {
  it('uses the active locale when a disconnected request creates its error', async () => {
    setRuntimeI18nLocale('zh')
    const gateway = new HermesGateway()

    await expect(gateway.request('session.list')).rejects.toThrow('Aino 网关未连接')

    setRuntimeI18nLocale('en')
    await expect(gateway.request('session.list')).rejects.toThrow('Aino gateway is not connected')
  })
})
