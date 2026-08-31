import { describe, expect, it } from 'vitest'

import { ACCENT_LOCALES } from './i18n'

type Leaf = string | ((...args: never[]) => string)

function leafEntries(node: unknown, prefix = ''): Array<[string, Leaf]> {
  if (typeof node === 'function' || typeof node === 'string') {
    return [[prefix, node as Leaf]]
  }

  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    leafEntries(value, prefix ? `${prefix}.${key}` : key)
  )
}

describe('ACCENT_LOCALES', () => {
  it('covers every shipped locale with the same message tree', () => {
    const enPaths = leafEntries(ACCENT_LOCALES.en).map(([path]) => path)

    expect(leafEntries(ACCENT_LOCALES.ja).map(([path]) => path)).toEqual(enPaths)
    expect(leafEntries(ACCENT_LOCALES.zh).map(([path]) => path)).toEqual(enPaths)
    expect(leafEntries(ACCENT_LOCALES['zh-hant']).map(([path]) => path)).toEqual(enPaths)
  })

  it('translates the picker chrome and keeps interpolation values', () => {
    const en = Object.fromEntries(leafEntries(ACCENT_LOCALES.en))
    const zh = Object.fromEntries(leafEntries(ACCENT_LOCALES.zh))
    const picked = zh.pickedForContrast as (override: string, painted: string) => string
    const mode = zh.modeLabel as (mode: string) => string

    for (const path of ['triggerTitle', 'reset', 'hexInputLabel', 'contrastLabel'] as const) {
      expect(zh[path], path).toBeDefined()
      expect(zh[path], path).not.toBe(en[path])
    }

    expect(picked('#ffffff', '#000000')).toContain('#ffffff')
    expect(picked('#ffffff', '#000000')).toContain('#000000')
    expect(mode('dark')).toBe('深色')
    expect(mode('future-mode')).toBe('future-mode')
  })
})
