import { describe, expect, it } from 'vitest'

import { en } from './en'
import { zh } from './zh'

interface EnglishLeaf {
  key: string
  value: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCompleteEnglishSentence(value: string): boolean {
  if (/\p{Script=Han}/u.test(value) || /https?:\/\//.test(value)) {
    return false
  }

  const words = value.match(/[A-Za-z]{2,}/g) ?? []

  return words.length >= 3 && /[.!?…]$/.test(value.trim())
}

function findEnglishOnlyLeaves(english: unknown, simplifiedChinese: unknown, prefix = ''): EnglishLeaf[] {
  if (typeof english === 'string' && typeof simplifiedChinese === 'string') {
    return english === simplifiedChinese && isCompleteEnglishSentence(simplifiedChinese)
      ? [{ key: prefix, value: simplifiedChinese }]
      : []
  }

  if (!isRecord(english) || !isRecord(simplifiedChinese)) {
    return []
  }

  return Object.keys(english).flatMap(key =>
    findEnglishOnlyLeaves(english[key], simplifiedChinese[key], prefix ? `${prefix}.${key}` : key)
  )
}

describe('Simplified Chinese catalog coverage', () => {
  it('does not leave complete English sentences in the Chinese catalog', () => {
    expect(findEnglishOnlyLeaves(en, zh)).toEqual([])
  })
})
