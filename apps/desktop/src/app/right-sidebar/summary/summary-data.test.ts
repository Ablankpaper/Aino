import { describe, expect, it } from 'vitest'

import type { LocalHardware } from '@/types/hermes'

import { hardwareMeters, summaryEnvironmentState } from './summary-data'

describe('summary data helpers', () => {
  it('does not expose a previous workspace while ownership is changing', () => {
    expect(summaryEnvironmentState({ cwd: '/old', cwdOwner: 'old', selectedSession: 'new' })).toEqual({ kind: 'empty' })
  })

  it('keeps unavailable hardware distinct from zero usage', () => {
    expect(hardwareMeters(null)).toEqual({ kind: 'unavailable' })

    const emptyHardware: LocalHardware = {
      gpu_name: null,
      gpu_util_percent: null,
      ram_available_bytes: 0,
      ram_total_bytes: 0,
      uma: false,
      vram_label: '',
      vram_total_bytes: 0,
      vram_usable_bytes: 0,
      vram_used_bytes: null
    }

    expect(hardwareMeters(emptyHardware)).toEqual({ kind: 'ready', ramPercent: null, vramPercent: null })
  })
})
