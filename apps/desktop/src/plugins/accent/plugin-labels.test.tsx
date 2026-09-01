import type { PluginContext } from '@hermes/plugin-sdk'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import plugin from './plugin'

interface Registration {
  data?: Record<string, unknown>
  id: string
}

function recordingContext(t: (key: string) => string): { ctx: PluginContext; registrations: Registration[] } {
  const registrations: Registration[] = []

  const ctx = {
    source: 'plugin:accent',
    i18n: { register: () => () => undefined, t },
    onDispose: (_dispose: () => void) => undefined,
    register: (registration: Registration) => {
      registrations.push(registration)

      return () => undefined
    },
    registerMany: (items: Registration[]) => {
      registrations.push(...items)

      return () => undefined
    },
    rest: vi.fn(async () => ({})),
    socket: vi.fn(() => () => undefined),
    os: {
      notify: vi.fn(),
      openExternal: vi.fn(async () => false),
      revealPath: vi.fn(async () => false),
      pickSavePath: vi.fn(async () => null),
      pickOpenPath: vi.fn(async () => null),
      writeClipboard: vi.fn(async () => false)
    },
    storage: {
      get: () => undefined,
      set: () => undefined,
      remove: () => undefined
    }
  } as unknown as PluginContext

  return { ctx, registrations }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('localized registration labels', () => {
  it('uses the active locale for palette labels', () => {
    const harness = recordingContext(
      key =>
        ({
          resetCommand: '强调色：恢复主题默认值',
          copyCommand: '强调色：复制当前颜色'
        })[key] ?? key
    )

    plugin.register(harness.ctx)

    const reset = harness.registrations.find(registration => registration.id === 'reset')
    const copy = harness.registrations.find(registration => registration.id === 'copy')

    expect(reset?.data?.label).toBe('强调色：恢复主题默认值')
    expect(copy?.data?.label).toBe('强调色：复制当前颜色')
  })

  it('keeps palette labels readable when an older host echoes raw keys', () => {
    const harness = recordingContext(key => key)

    plugin.register(harness.ctx)

    const reset = harness.registrations.find(registration => registration.id === 'reset')
    const copy = harness.registrations.find(registration => registration.id === 'copy')

    expect(reset?.data?.label).toBe('Accent: reset to the theme default')
    expect(copy?.data?.label).toBe('Accent: copy the current color')
  })
})
