import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { TRANSLATIONS } from '@/i18n/catalog'

import { extractAlert, getAlertLabel } from './alert'

describe('extractAlert', () => {
  it('detects each GFM alert kind from the leading marker', () => {
    for (const [marker, type] of [
      ['[!NOTE]', 'note'],
      ['[!TIP]', 'tip'],
      ['[!IMPORTANT]', 'important'],
      ['[!WARNING]', 'warning'],
      ['[!CAUTION]', 'caution']
    ] as const) {
      const node = createElement('p', null, `${marker}\nBody text`)
      const result = extractAlert(node)

      expect(result?.type).toBe(type)
    }
  })

  it('is case-insensitive on the marker', () => {
    expect(extractAlert(createElement('p', null, '[!note] hi'))?.type).toBe('note')
  })

  it('returns null for a plain blockquote', () => {
    expect(extractAlert(createElement('p', null, 'just a quote'))).toBeNull()
    expect(extractAlert('no marker here')).toBeNull()
  })

  it('strips the marker token from the body', () => {
    const result = extractAlert(createElement('p', null, '[!WARNING]\nDanger ahead'))

    expect(result).not.toBeNull()
    // The marker must not survive into the rendered body.
    expect(JSON.stringify(result?.body)).not.toContain('[!WARNING]')
    expect(JSON.stringify(result?.body)).toContain('Danger ahead')
  })
})

describe('alert labels', () => {
  it('uses Simplified Chinese labels for GitHub alert kinds', () => {
    const labels = TRANSLATIONS.zh.assistant.markdown.alerts

    expect(getAlertLabel('caution', labels)).toBe('注意')
    expect(getAlertLabel('important', labels)).toBe('重要')
    expect(getAlertLabel('note', labels)).toBe('备注')
    expect(getAlertLabel('tip', labels)).toBe('提示')
    expect(getAlertLabel('warning', labels)).toBe('警告')
  })
})
