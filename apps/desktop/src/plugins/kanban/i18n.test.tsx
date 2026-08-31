import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { usePluginI18n } = vi.hoisted(() => ({ usePluginI18n: vi.fn() }))

vi.mock('@hermes/plugin-sdk', () => ({ usePluginI18n }))

import { KANBAN_LOCALES, useKanban } from './i18n'

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
})

describe('useKanban', () => {
  it('uses the English bundle when the plugin translator still returns raw keys', () => {
    render(<RawKeyProbe />)

    expect(screen.getByTestId('new-task').textContent).toBe('New task')
    expect(screen.getByTestId('selected').textContent).toBe('3 selected')
  })
})
