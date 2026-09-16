import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { $activeSessionId, $currentModel, $currentProvider, $gatewayState, $modelPickerOpen } from '@/store/session'
import { deferred } from '@/test/deferred'
import { stubMenuDomApis, stubResizeObserver } from '@/test/jsdom'

import { ModelPickerOverlay } from './model-picker-overlay'

vi.mock('@/lib/model-options', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  requestModelOptions: vi.fn(async () => ({
    providers: [{ name: 'Custom fixture', slug: 'custom:fixture', models: ['fixture-next'] }]
  }))
}))

stubMenuDomApis()
stubResizeObserver()
afterEach(() => {
  cleanup()
  $activeSessionId.set(null)
  $modelPickerOpen.set(false)
})

it('preserves the awaited result from the overlay action through the real dialog', async () => {
  $activeSessionId.set('runtime-fixture')
  $currentProvider.set('custom:fixture')
  $currentModel.set('fixture-old')
  $gatewayState.set('open')
  $modelPickerOpen.set(true)
  const pending = deferred<boolean>()
  const select = vi.fn(() => pending.promise)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ModelPickerOverlay onSelect={select} profile="default" requestGateway={vi.fn()} />
    </QueryClientProvider>
  )
  const row = await screen.findByRole('option', { name: 'fixture-next' })
  fireEvent.click(row)
  expect(select).toHaveBeenCalledWith({
    provider: 'custom:fixture',
    model: 'fixture-next',
    sessionId: 'runtime-fixture'
  })
  expect($modelPickerOpen.get()).toBe(true)
  await act(async () => pending.resolve(false))
  expect($modelPickerOpen.get()).toBe(true)
  select.mockResolvedValueOnce(true)
  fireEvent.click(row)
  await waitFor(() => expect($modelPickerOpen.get()).toBe(false))
})
