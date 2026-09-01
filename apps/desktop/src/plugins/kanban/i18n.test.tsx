import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { usePluginI18n } = vi.hoisted(() => ({ usePluginI18n: vi.fn() }))

vi.mock('@hermes/plugin-sdk', () => ({ usePluginI18n }))

import { KANBAN_LOCALES, type KanbanText, laneLabel, useKanban } from './i18n'

type Leaf = string | ((...args: never[]) => string)

function leafEntries(node: unknown, prefix = ''): Array<[string, Leaf]> {
  if (typeof node === 'function' || typeof node === 'string') {
    return [[prefix, node as Leaf]]
  }

  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    leafEntries(value, prefix ? `${prefix}.${key}` : key)
  )
}

function RawKeyProbe() {
  const k = useKanban()

  return (
    <>
      <span data-testid="new-task">{k.newTask}</span>
      <span data-testid="selected">{k.nSelected(3)}</span>
    </>
  )
}

beforeEach(() => {
  usePluginI18n.mockReturnValue((key: string) => key)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('KANBAN_LOCALES', () => {
  it('covers the English key tree in every shipped locale', () => {
    const enPaths = leafEntries(KANBAN_LOCALES.en).map(([path]) => path)

    expect(leafEntries(KANBAN_LOCALES.ja).map(([path]) => path)).toEqual(enPaths)
    expect(leafEntries(KANBAN_LOCALES.zh).map(([path]) => path)).toEqual(enPaths)
    expect(leafEntries(KANBAN_LOCALES['zh-hant']).map(([path]) => path)).toEqual(enPaths)
  })

  it('translates the auto-description failure copy for Chinese users', () => {
    const en = Object.fromEntries(leafEntries(KANBAN_LOCALES.en))
    const zh = Object.fromEntries(leafEntries(KANBAN_LOCALES.zh))

    expect(zh.autoDescribeFailed).toBeDefined()
    expect(zh.autoDescribeFailed).not.toBe(en.autoDescribeFailed)
  })

  it('localizes workspace and run-state identifiers without hiding unknown values', () => {
    const zh = KANBAN_LOCALES.zh as unknown as {
      runStatusLabel: (status: string) => string
      workspaceKindLabel: (kind: string) => string
    }

    expect(zh.workspaceKindLabel('scratch')).toBe('临时沙箱')
    expect(zh.workspaceKindLabel('worktree')).toBe('工作树')
    expect(zh.workspaceKindLabel('custom_workspace')).toBe('custom_workspace')
    expect(zh.runStatusLabel('timed_out')).toBe('已超时')
    expect(zh.runStatusLabel('spawn_failed')).toBe('启动失败')
    expect(zh.runStatusLabel('future_state')).toBe('future_state')
  })

  it('uses the core Chinese agent and profile terminology in user-facing copy', () => {
    const zh = KANBAN_LOCALES.zh

    expect(zh.col.triage.help).toBe('原始想法 — 由细化智能体整理出规格。')
    expect(zh.col.running.help).toBe('已被工作单元领取 — 有智能体在处理。由调度器设置。')
    expect(zh.col.review.help).toBe('审查智能体正在检查工作。由调度器设置。')
    expect(zh.modelInherit).toBe('配置档案默认')
    expect(zh.modelHint).toContain('所指派配置档案自身的设置')
    expect(zh.goalMode).toBe('目标模式（工作单元循环直到评审智能体认可完成）')
    expect(zh.reviewChecking).toBe('审查智能体正在检查已完成的工作。')
    expect(zh.evtSpecified).toBe('分诊智能体已撰写规格')
  })

  it('uses the translated label for the synthetic unassigned lane', () => {
    const k = { unassigned: '未分配' } as unknown as KanbanText

    expect(laneLabel(k, 'unassigned')).toBe('未分配')
    expect(laneLabel(k, 'researcher')).toBe('researcher')
  })
})

describe('useKanban', () => {
  it('uses the English bundle when the plugin translator still returns raw keys', () => {
    render(<RawKeyProbe />)

    expect(screen.getByTestId('new-task').textContent).toBe('New task')
    expect(screen.getByTestId('selected').textContent).toBe('3 selected')
  })
})
