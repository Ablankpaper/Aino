import type { PluginContext } from '@hermes/plugin-sdk'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import plugin from './plugin'

interface Registration {
  data?: Record<string, unknown>
  id: string
}

function recordingContext(t: (key: string) => string): {
  ctx: PluginContext
  registrations: Registration[]
} {
  const registrations: Registration[] = []

  const ctx = {
    source: 'plugin:kanban',
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
  it('uses the active locale for the sidebar and open-board palette labels', () => {
    const harness = recordingContext(
      key =>
        ({
          nav: '看板',
          openBoard: '看板：打开面板',
          newTaskCommand: '看板：新建任务'
        })[key] ?? key
    )

    plugin.register(harness.ctx)

    const nav = harness.registrations.find(registration => registration.id === 'nav')
    const open = harness.registrations.find(registration => registration.id === 'open')

    expect(nav?.data?.label).toBe('看板')
    expect(open?.data?.label).toBe('看板：打开面板')
  })

  it('keeps registration labels readable when an older host echoes raw keys', () => {
    const harness = recordingContext(key => key)

    plugin.register(harness.ctx)

    const nav = harness.registrations.find(registration => registration.id === 'nav')
    const open = harness.registrations.find(registration => registration.id === 'open')
    const newTask = harness.registrations.find(registration => registration.id === 'new-task')

    expect(nav?.data?.label).toBe('Kanban')
    expect(open?.data?.label).toBe('Kanban: Open board')
    expect(newTask?.data?.label).toBe('Kanban: New task')
  })
})
