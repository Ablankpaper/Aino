import { useStore } from '@nanostores/react'
import { useEffect, useRef, useState } from 'react'
import { useInRouterContext, useNavigate } from 'react-router'

import { SETTINGS_ROUTE } from '@/app/routes'
import { useI18n } from '@/i18n'
import { Check } from '@/lib/icons'
import { modelSearchText } from '@/lib/model-search-text'
import { foldIncludes } from '@/lib/text'
import type { ManagedModelRouteCapability } from '@/store/gateway-managed-capability'
import { notifyError } from '@/store/notifications'
import { platformModelCatalog } from '@/store/platform-models'

import type { PlatformModel } from '../../shared/platform-contract'

import { PlatformModelDetails } from './platform-model-details'
import { Button } from './ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command'

export function usePlatformModels() {
  const catalog = platformModelCatalog()
  const state = useStore(catalog.state)
  const account = useStore(catalog.account)
  useEffect(() => {
    if (state.phase === 'idle') {
      void catalog.load()
    }
  }, [catalog, state.phase, account?.revision])

  return { ...state, account, refresh: catalog.load }
}

export interface PlatformModelListProps {
  selectedId?: string
  disabled?: boolean
  onChooseCustom?: () => void
  onSelect: (model: PlatformModel) => Promise<boolean> | boolean | void
  onApplied?: () => void
  managedCapability: ManagedModelRouteCapability
}

function AccountAction({ label }: { label: string }) {
  const navigate = useNavigate()

  return (
    <Button data-action="account" onClick={() => navigate(`${SETTINGS_ROUTE}?tab=account`)} size="sm" variant="ghost">
      {label}
    </Button>
  )
}

export function PlatformModelList({
  selectedId,
  disabled,
  onChooseCustom,
  onSelect,
  onApplied,
  managedCapability
}: PlatformModelListProps) {
  const { t } = useI18n()
  const copy = t.platformModels
  const catalog = usePlatformModels()
  const [search, setSearch] = useState('')
  const [highlighted, setHighlighted] = useState(selectedId || '')
  const [pending, setPending] = useState(false)
  const selecting = useRef(false)
  const inRouter = useInRouterContext()

  const models = catalog.models.filter(model =>
    foldIncludes(
      modelSearchText(`${model.display_name} ${model.model} ${model.provider_label}`),
      modelSearchText(search)
    )
  )

  const detail =
    catalog.models.find(model => model.id === highlighted) ?? catalog.models.find(model => model.id === selectedId)

  const unavailableModels = models.filter(model => model.state !== 'available')

  const chooseCustom = onChooseCustom ? (
    <Button data-action="custom" onClick={onChooseCustom} size="sm" variant="ghost">
      {copy.chooseCustom}
    </Button>
  ) : null

  const select = async (model: PlatformModel) => {
    if (disabled || managedCapability !== 'supported' || selecting.current || model.state !== 'available') {
      return
    }

    selecting.current = true
    setPending(true)

    try {
      if ((await onSelect(model)) !== false) {
        onApplied?.()
      }
    } catch (error) {
      notifyError(error, copy.bindingFailed)
    } finally {
      selecting.current = false
      setPending(false)
    }
  }

  return (
    <div className="min-w-0">
      <Command
        onKeyDown={event => event.stopPropagation()}
        onValueChange={setHighlighted}
        shouldFilter={false}
        value={highlighted}
      >
        <CommandInput aria-label={copy.search} onValueChange={setSearch} placeholder={copy.search} value={search} />
        <CommandList aria-label={copy.builtIn} className="max-h-64">
          {managedCapability !== 'supported' ? (
            <p className="p-3 text-xs text-muted-foreground" role="status">
              {copy.unsupported}
            </p>
          ) : catalog.phase === 'signed_out' ? (
            <p className="p-3 text-xs text-muted-foreground">{copy.not_authenticated}</p>
          ) : catalog.phase === 'loading' && !models.length ? (
            <p className="p-3 text-xs text-muted-foreground" role="status">
              {copy.loading}
            </p>
          ) : catalog.phase === 'error' ? (
            <p className="p-3 text-xs text-muted-foreground" role="alert">
              {copy.catalogError}
            </p>
          ) : (
            <>
              <CommandEmpty>{copy.empty}</CommandEmpty>
              <CommandGroup>
                {models.map(model => (
                  <CommandItem
                    disabled={disabled || pending || managedCapability !== 'supported' || model.state !== 'available'}
                    key={model.id}
                    onSelect={() => void select(model)}
                    value={model.id}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{model.display_name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {model.state === 'available'
                          ? model.billing_source === 'subscription'
                            ? copy.subscription
                            : copy.balance
                          : model.state === 'unavailable'
                            ? copy.unavailable
                            : copy[model.state]}
                      </span>
                    </span>
                    {selectedId === model.id && <Check className="size-3.5 shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
      {managedCapability !== 'supported' ? (
        chooseCustom && <div className="border-t border-(--ui-stroke-tertiary) px-3 py-2">{chooseCustom}</div>
      ) : catalog.phase === 'signed_out' ? (
        inRouter && (
          <div className="border-t border-(--ui-stroke-tertiary) px-3 py-2">
            <AccountAction label={copy.myAccount} />
          </div>
        )
      ) : catalog.phase === 'error' ? (
        <div className="border-t border-(--ui-stroke-tertiary) px-3 py-2">
          <Button onClick={() => void catalog.refresh()} size="sm" variant="ghost">
            {copy.retry}
          </Button>
        </div>
      ) : catalog.phase === 'ready' && catalog.models.length === 0 ? (
        chooseCustom && <div className="border-t border-(--ui-stroke-tertiary) px-3 py-2">{chooseCustom}</div>
      ) : unavailableModels.length > 0 ? (
        <div className="space-y-1 border-t border-(--ui-stroke-tertiary) px-3 py-2">
          {unavailableModels.map(model => (
            <div
              aria-label={copy.recoveryFor(model.display_name)}
              className="flex flex-wrap items-center gap-1"
              key={model.id}
              role="group"
            >
              <span className="mr-auto truncate text-xs text-muted-foreground">{model.display_name}</span>
              {['insufficient_balance', 'quota_exhausted'].includes(model.state) && inRouter && (
                <AccountAction label={copy.myAccount} />
              )}
              {chooseCustom}
            </div>
          ))}
        </div>
      ) : null}
      {detail && (
        <details className="border-t border-(--ui-stroke-tertiary) px-3 py-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground">{copy.details}</summary>
          <PlatformModelDetails model={detail} />
        </details>
      )}
    </div>
  )
}
