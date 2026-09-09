import { describe, expect, it } from 'vitest'

import { TRANSLATIONS } from '@/i18n/catalog'

import { getSplitDirectionLabel } from './split-submenu'

describe('split direction labels', () => {
  it('uses Simplified Chinese labels for each split edge', () => {
    const labels = TRANSLATIONS.zh.commandCenter.splitDirections

    expect(getSplitDirectionLabel('right', labels)).toBe('右侧')
    expect(getSplitDirectionLabel('bottom', labels)).toBe('下方')
    expect(getSplitDirectionLabel('left', labels)).toBe('左侧')
    expect(getSplitDirectionLabel('top', labels)).toBe('上方')
  })
})
