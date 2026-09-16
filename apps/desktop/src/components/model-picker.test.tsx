import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { platformAccountActions } from '@/api/platform'
import { I18nProvider } from '@/i18n'
import { clearGatewayManagedCapabilities, recordGatewayReadyCapability } from '@/store/gateway-managed-capability'
import { $localModelsEnabled } from '@/store/local-models-flag'
import { $localRuntimeJobs } from '@/store/local-runtime-jobs'
import { deferred } from '@/test/deferred'
import { stubMenuDomApis, stubResizeObserver } from '@/test/jsdom'
import { platformModel, platformSnapshot } from '@/test/platform-model'
import type { LocalRuntimeJob, ModelOptionsResponse } from '@/types/hermes'

import { ModelPickerDialog } from './model-picker'

vi.mock('@/hermes', () => ({
  getLocalModelsStatus: vi.fn().mockResolvedValue({ loading: {} })
}))
vi.mock('@/lib/model-options', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  requestModelOptions: vi.fn()
}))

import { requestModelOptions } from '@/lib/model-options'

stubResizeObserver()
stubMenuDomApis()

const OPTIONS: ModelOptionsResponse = {
  model: 'Qwen3.6-27B-UD-Q4_K_XL',
  provider: 'llamacpp',
  providers: [
    {
      slug: 'llamacpp',
      name: 'Local',
      models: ['Qwen3.6-27B-UD-Q4_K_XL'],
      is_current: true,
      authenticated: true
    },
    {
      slug: 'nous',
      name: 'Nous',
      models: ['Hermes-4.5'],
      authenticated: true
    }
  ]
}

const DOWNLOAD_JOB: LocalRuntimeJob = {
  job_id: 'dl1',
  kind: 'model-download',
  target: 'Qwen3.8 Flash Next (UD-Q4_K_XL)',
  model_id: 'qwen3.8-flash-next',
  status: 'running',
  phase: 'downloading',
  detail: '',
  total_bytes: 100,
  done_bytes: 41,
  percent: 41,
  error: null
}

function renderPicker(ui?: Partial<Parameters<typeof ModelPickerDialog>[0]>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const element: ReactElement = (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ModelPickerDialog
          currentModel="Qwen3.6-27B-UD-Q4_K_XL"
          currentProvider="llamacpp"
          onOpenChange={() => undefined}
          onSelect={() => undefined}
          open
          {...ui}
        />
      </I18nProvider>
    </QueryClientProvider>
  )

  return render(element)
}

beforeEach(() => {
  vi.mocked(requestModelOptions).mockResolvedValue(OPTIONS)
  $localRuntimeJobs.set([])
  // These suites exercise the local-models rows, which ship behind --local.
  $localModelsEnabled.set(true)
})

it('awaits selection, rejects duplicates, and leaves the dialog open on failure', async () => {
  const pending = deferred<boolean>()
  const onSelect = vi.fn(() => pending.promise)
  const onOpenChange = vi.fn()
  renderPicker({ onSelect, onOpenChange })
  const row = await screen.findByRole('option', { name: /Hermes-4.5/ })
  fireEvent.click(row)
  fireEvent.click(row)
  expect(onSelect).toHaveBeenCalledTimes(1)
  expect(onOpenChange).not.toHaveBeenCalled()
  await act(async () => pending.resolve(false))
  expect(onOpenChange).not.toHaveBeenCalled()
  onSelect.mockResolvedValueOnce(true)
  fireEvent.click(row)
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
})

it('explains and blocks switches from managed to custom while the owning chat is busy', async () => {
  const onSelect = vi.fn()
  renderPicker({ currentProvider: 'aino', currentModel: 'catalog-a', busy: true, onSelect })
  const row = await screen.findByRole('option', { name: /Hermes-4.5/ })
  expect(screen.getByRole('status').textContent).toContain('Wait for this chat')
  expect(row.getAttribute('aria-disabled')).toBe('true')
  fireEvent.click(row)
  expect(onSelect).not.toHaveBeenCalled()
})

it('does not dismiss a different picker owner when an earlier selection completes', async () => {
  const pending = deferred<boolean>()
  const onOpenChange = vi.fn()
  const client = new QueryClient()

  const picker = (sessionId: string) => (
    <QueryClientProvider client={client}>
      <ModelPickerDialog
        currentModel="old"
        currentProvider="nous"
        onOpenChange={onOpenChange}
        onSelect={() => pending.promise}
        open
        sessionId={sessionId}
      />
    </QueryClientProvider>
  )

  const view = render(picker('session-a'))
  fireEvent.click(await screen.findByRole('option', { name: /Hermes-4.5/ }))
  view.rerender(picker('session-b'))
  await act(async () => pending.resolve(true))
  expect(onOpenChange).not.toHaveBeenCalled()
})

afterEach(() => {
  cleanup()
  clearGatewayManagedCapabilities()
  Reflect.deleteProperty(window, 'hermesDesktop')
  vi.clearAllMocks()
})

it('blocks Aino on an older exact route while custom providers remain selectable', async () => {
  Object.defineProperty(window, 'hermesDesktop', {
    configurable: true,
    value: {
      platformAccount: {
        status: async () => platformSnapshot(),
        capabilities: async () => ({}),
        onChanged: () => () => undefined
      },
      platformModels: { list: async () => [platformModel()] }
    }
  })
  await platformAccountActions(window.hermesDesktop.platformAccount).refresh()
  recordGatewayReadyCapability(
    { connectionId: 'old-owner', profile: 'default' },
    { type: 'gateway.ready', payload: {} }
  )
  const onSelect = vi.fn()

  renderPicker({ includePlatform: true, ownerConnectionId: 'old-owner', onSelect })
  fireEvent.click(screen.getByRole('button', { name: 'Aino models' }))
  expect(screen.getByRole('status').textContent).toContain('does not support Aino models')
  expect(screen.queryByRole('option', { name: /Fixture Model/ })).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Custom models' }))
  fireEvent.click(await screen.findByRole('option', { name: /Hermes-4.5/ }))
  expect(onSelect).toHaveBeenCalledWith({ provider: 'nous', model: 'Hermes-4.5' })
})

describe('ModelPickerDialog download rows', () => {
  it('shows an in-flight download as a disabled progress row in the Local group', async () => {
    $localRuntimeJobs.set([DOWNLOAD_JOB])
    renderPicker()

    expect(await screen.findByText('Qwen3.6-27B-UD-Q4_K_XL')).toBeTruthy()

    const row = screen.getByText('Qwen3.8 Flash Next (UD-Q4_K_XL)')

    expect(row).toBeTruthy()
    expect(screen.getByText('41%')).toBeTruthy()

    // Disabled: cmdk marks the item unselectable.
    const item = row.closest('[cmdk-item]')

    expect(item?.getAttribute('aria-disabled')).toBe('true')
  })

  it('shows a first-ever download under its own Local group when no local provider exists yet', async () => {
    $localRuntimeJobs.set([DOWNLOAD_JOB])
    vi.mocked(requestModelOptions).mockResolvedValue({
      providers: [OPTIONS.providers![1]]
    })
    renderPicker()

    expect(await screen.findByText('Hermes-4.5')).toBeTruthy()
    expect(screen.getByText('Qwen3.8 Flash Next (UD-Q4_K_XL)')).toBeTruthy()
    expect(screen.getByText('41%')).toBeTruthy()
  })

  it('quickstart shows while downloading but not during later phases', async () => {
    const quickstart: LocalRuntimeJob = { ...DOWNLOAD_JOB, job_id: 'q1', kind: 'quickstart', phase: 'downloading' }

    $localRuntimeJobs.set([quickstart])
    renderPicker()
    expect(await screen.findByText('Qwen3.8 Flash Next (UD-Q4_K_XL)')).toBeTruthy()

    // The model is staged once quickstart moves on to activating it — the
    // placeholder row must leave rather than sit beside the real model.
    $localRuntimeJobs.set([{ ...quickstart, phase: 'starting-server' }])
    await waitFor(() => {
      expect(screen.queryByText('Qwen3.8 Flash Next (UD-Q4_K_XL)')).toBeNull()
    })
  })

  it('refetches the model options when a download it saw running completes', async () => {
    $localRuntimeJobs.set([DOWNLOAD_JOB])
    renderPicker()
    await screen.findByText('Qwen3.6-27B-UD-Q4_K_XL')

    expect(vi.mocked(requestModelOptions).mock.calls.length).toBe(1)

    $localRuntimeJobs.set([{ ...DOWNLOAD_JOB, status: 'done', phase: 'done' }])
    await waitFor(() => {
      expect(vi.mocked(requestModelOptions).mock.calls.length).toBe(2)
    })
  })
})
