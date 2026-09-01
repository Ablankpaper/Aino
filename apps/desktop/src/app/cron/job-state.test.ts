import { describe, expect, it } from 'vitest'

import { setRuntimeI18nLocale } from '@/i18n'

import { jobTitle } from './job-state'

describe('jobTitle', () => {
  it('uses a localized fallback when a job has no displayable identity', () => {
    setRuntimeI18nLocale('zh')

    try {
      expect(jobTitle({ id: '', name: '', prompt: '', script: '' } as never)).toBe('定时任务')
    } finally {
      setRuntimeI18nLocale('en')
    }
  })
})
