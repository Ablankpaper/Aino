import { describe, expect, it } from 'vitest'

import { localizeFilterOption } from './filter-menu'

describe('sidebar filter labels', () => {
  it('resolves option ids through the active locale label map', () => {
    const option = localizeFilterOption({ icon: 'clock', id: 'updated', labelKey: 'updated' }, { updated: '更新时间' })

    expect(option.label).toBe('更新时间')
    expect(option.id).toBe('updated')
  })
})
