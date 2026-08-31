import { describe, expect, it } from 'vitest'

import { TRANSLATIONS } from '@/i18n'

import { localizedBlueprintCopy } from './blueprint-copy'

describe('localized blueprint copy', () => {
  it('uses Simplified Chinese title and description for built-in blueprints', () => {
    const blueprint = {
      key: 'morning-brief',
      title: 'Morning briefing',
      description: 'A short daily briefing.',
      category: 'daily',
      tags: [],
      fields: [],
      command: '',
      appUrl: ''
    }

    expect(localizedBlueprintCopy(blueprint, TRANSLATIONS.zh)).toEqual({
      title: '晨间简报',
      description: '每天早上的简短简报：今日的日历、天气，以及任何等待你处理的紧急事项。'
    })
  })

  it('keeps backend copy for unknown blueprint keys', () => {
    const blueprint = {
      key: 'community-blueprint',
      title: 'Community blueprint',
      description: 'Provided by a plugin.',
      category: 'custom',
      tags: [],
      fields: [],
      command: '',
      appUrl: ''
    }

    expect(localizedBlueprintCopy(blueprint, TRANSLATIONS.zh)).toEqual({
      title: 'Community blueprint',
      description: 'Provided by a plugin.'
    })
  })
})
