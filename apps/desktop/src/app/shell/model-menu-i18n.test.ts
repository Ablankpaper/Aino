import { describe, expect, it } from 'vitest'

import { en } from '@/i18n/en'
import { zh } from '@/i18n/zh'

describe('model menu locale coverage', () => {
  it('does not expose the MoA section chrome in English for Chinese users', () => {
    const enMenu = en.shell.modelMenu as unknown as Record<string, unknown>

    const zhMenu = zh.shell.modelMenu as unknown as {
      moaPrefix: string
      moaPresets: string
    }

    expect(zhMenu.moaPresets).toBe('MoA 预设')
    expect(zhMenu.moaPrefix).toBe('MoA：')
    expect(zhMenu.moaPresets).not.toBe(enMenu.moaPresets)
    expect(zhMenu.moaPrefix).not.toBe(enMenu.moaPrefix)
  })
})
