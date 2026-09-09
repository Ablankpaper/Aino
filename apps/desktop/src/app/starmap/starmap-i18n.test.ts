import { describe, expect, it } from 'vitest'

import { en } from '@/i18n/en'
import { zh } from '@/i18n/zh'

describe('starmap locale coverage', () => {
  it('provides Chinese copy for the interactive map chrome', () => {
    const enMap = en.starmap as unknown as Record<string, unknown>

    const zhMap = zh.starmap as unknown as {
      archiveSkill: string
      deleteMemory: string
      deleteMemoryDescription: string
      deleteMemoryTitle: (label: string) => string
      editNode: (kind: string, label: string) => string
      legendAge: string
      pauseTimeline: string
      playTimeline: string
      skill: string
      timelineScrubber: string
    }

    for (const key of [
      'skill',
      'legendAge',
      'playTimeline',
      'pauseTimeline',
      'timelineScrubber',
      'archiveSkill',
      'deleteMemory',
      'deleteMemoryDescription'
    ] as const) {
      expect(zhMap[key], key).toBeDefined()
      expect(zhMap[key], key).not.toBe(enMap[key])
    }

    expect(zhMap.editNode('技能', '示例')).toContain('示例')
    expect(zhMap.deleteMemoryTitle('示例')).toContain('示例')
  })

  it('localizes the shared skill-archive confirmation used by the node menu', () => {
    const skills = zh.skills as unknown as {
      archiveConfirmDescription: string
      archiveConfirmTitle: (name: string) => string
    }

    expect(skills.archiveConfirmDescription).toBe('技能会被归档，可通过 hermes curator restore 恢复。')
    expect(skills.archiveConfirmTitle('示例')).toBe('归档技能“示例”？')
  })
})
