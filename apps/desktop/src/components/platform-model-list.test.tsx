import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { platformAccountActions } from '@/api/platform'
import { stubMenuDomApis, stubResizeObserver } from '@/test/jsdom'
import { platformModel, platformSnapshot } from '@/test/platform-model'

import { PlatformModelList } from './platform-model-list'

beforeEach(() => {
  stubResizeObserver()
  stubMenuDomApis()
})
afterEach(() => {
  Reflect.deleteProperty(window, 'hermesDesktop')
  vi.unstubAllGlobals()
})

it('uses catalog labels, searches and blocks unavailable models while retaining selection', async () => {
  const snapshot = platformSnapshot()
  const account = { status: async () => snapshot, capabilities: async () => ({}), onChanged: () => () => {} }
  Object.defineProperty(window, 'hermesDesktop', {
    configurable: true,
    value: {
      platformAccount: account,
      platformModels: {
        list: async () => [
          platformModel(),
          { ...platformModel('blocked'), display_name: 'Unavailable Fixture', state: 'quota_exhausted' }
        ]
      }
    }
  })
  await platformAccountActions(window.hermesDesktop.platformAccount).refresh()
  const select = vi.fn().mockResolvedValue(true)
  render(<PlatformModelList onSelect={select} selectedId="catalog-a" />)
  await screen.findByText('Fixture Model')
  expect(screen.getByText('Unavailable Fixture').closest('[cmdk-item]')?.getAttribute('aria-disabled')).toBe('true')
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Fixture Model' } })
  await waitFor(() => expect(screen.queryByText('Unavailable Fixture')).toBeNull())
  fireEvent.click(screen.getByText('Fixture Model'))
  await waitFor(() =>
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 'catalog-a', model: 'wire-model' }))
  )
})
