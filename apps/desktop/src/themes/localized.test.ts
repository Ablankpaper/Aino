import { afterEach, describe, expect, it } from 'vitest'

import { setRuntimeI18nLocale } from '@/i18n'

import { localizedThemeCopyNow } from './localized'
import { githubTheme } from './presets'

describe('localized theme copy', () => {
  afterEach(() => {
    setRuntimeI18nLocale('en')
  })

  it('uses Simplified Chinese labels and descriptions for built-in themes', () => {
    setRuntimeI18nLocale('zh')

    expect(localizedThemeCopyNow(githubTheme)).toEqual({
      label: 'GitHub',
      description: 'GitHub 风格的浅色与深色默认主题'
    })
  })

  it('keeps an external theme copy when no locale override exists', () => {
    const external = {
      ...githubTheme,
      name: 'external-theme',
      label: 'External Theme',
      description: 'Provided by a user'
    }

    expect(localizedThemeCopyNow(external)).toEqual({
      label: 'External Theme',
      description: 'Provided by a user'
    })
  })
})
