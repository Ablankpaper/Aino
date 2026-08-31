import { describe, expect, it } from 'vitest'

import { localizedCompletionSoundName } from './completion-sound'

describe('completion sound display copy', () => {
  it('uses the localized preset name and falls back for an unknown preset', () => {
    const names = { '1': '双音提示' }

    expect(localizedCompletionSoundName(1, 'Two-note comfort', names)).toBe('双音提示')
    expect(localizedCompletionSoundName(99, 'Future sound', names)).toBe('Future sound')
  })

  it('ignores blank localized names', () => {
    expect(localizedCompletionSoundName(1, 'Two-note comfort', { '1': '  ' })).toBe('Two-note comfort')
  })
})
