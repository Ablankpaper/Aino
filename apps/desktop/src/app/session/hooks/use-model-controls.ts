import { type QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

import type { ModelSelection } from '@/app/shell/model-menu-panel'
import { useI18n } from '@/i18n'
import { resolveModelDefault } from '@/lib/model-default'
import { manualPickRemoved, modelOptionsQueryKey } from '@/lib/model-options'
import { platformDefaultScope } from '@/lib/platform-model-scope'
import { switchSessionModel } from '@/lib/session-model-switch'
import { reconcilePlatformDraftAccount } from '@/store/platform-draft-model'
import { platformModelCatalog } from '@/store/platform-models'
import { $activeGatewayProfile } from '@/store/profile'
import {
  $activeSessionId,
  $currentModel,
  $currentProvider,
  $selectedStoredSessionId,
  getComposerSelectionGeneration,
  getCurrentModelSource,
  markComposerSelectionDefault,
  setCurrentModel,
  setCurrentModelSource,
  setCurrentProvider
} from '@/store/session'
import { setCurrentPlatformOwner } from '@/store/session'
import type { ModelOptionsResponse } from '@/types/hermes'

interface ModelControlsOptions {
  cacheOwnerConnectionId?: string
  cacheProfile?: string
  queryClient: QueryClient
  requestGateway: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>
}

export function useModelControls({
  cacheOwnerConnectionId,
  cacheProfile,
  queryClient,
  requestGateway
}: ModelControlsOptions) {
  const { t } = useI18n()
  const copy = t.desktop
  const profileRefreshEpochRef = useRef(0)
  const handledAccountRef = useRef(platformModelCatalog().account.get())

  // All callbacks here read reactive session state from the store (.get())
  // rather than capturing it as a prop. The actions bag in wiring.tsx mutates
  // in place to keep a stable identity, so memoized surfaces capture these
  // callbacks once and never re-evaluate — a captured prop would be stale
  // forever. The store read is always current.
  const updateModelOptionsCache = useCallback(
    (
      sessionId: null | string,
      provider: string,
      model: string,
      includeGlobal: boolean,
      profile = cacheProfile || $activeGatewayProfile.get(),
      ownerConnectionId = cacheOwnerConnectionId
    ) => {
      const patch = (prev: ModelOptionsResponse | undefined) => {
        // Selection state can update before the catalog query has resolved.
        // Keep that optimistic cache structurally complete; the composer
        // interprets a response without `providers` as an empty catalog.
        const providers = prev?.providers?.length
          ? prev.providers
          : provider && model
            ? [{ models: [model], name: provider, slug: provider }]
            : []

        return { ...prev, provider, model, providers }
      }

      queryClient.setQueryData<ModelOptionsResponse>(modelOptionsQueryKey(profile, sessionId, ownerConnectionId), patch)

      if (includeGlobal) {
        queryClient.setQueryData<ModelOptionsResponse>(modelOptionsQueryKey(profile, null, ownerConnectionId), patch)
      }
    },
    [cacheOwnerConnectionId, cacheProfile, queryClient]
  )

  // Settings → Model writes the profile default, which the backend applies to
  // new sessions only. Keep a live session's renderer state and session-scoped
  // model-options cache authoritative instead of briefly painting the saved
  // default as if the active agent had switched. Marking the composer as
  // default-derived still lets the next fresh draft reseed from profile config.
  const applySavedMainModel = useCallback(
    (provider: string, model: string) => {
      const liveSessionId = $activeSessionId.get()

      markComposerSelectionDefault()

      if (!liveSessionId) {
        setCurrentProvider(provider)
        setCurrentModel(model)
      }

      // A null session id is the profile-global model-options key. Never patch
      // the live session key here: only config.set --session may change it.
      updateModelOptionsCache(null, provider, model, false)
    },
    [updateModelOptionsCache]
  )

  // Seed the composer's model state from the profile default. `force` reseeds
  // for a profile swap (the new profile has its own default); otherwise this
  // only fills an EMPTY selection so a user's pick (plain UI state in
  // $currentModel) survives the lifecycle refreshes that fire on boot / fresh
  // draft / session events. A live session owns the footer, so skip entirely.
  const refreshCurrentModel = useCallback(
    async (force = false) => {
      // A forced profile swap opens a new intent epoch; an older in-flight
      // response for a previous profile must stand down when it resolves.
      if (force) {
        profileRefreshEpochRef.current += 1
      }

      const profileRefreshEpoch = profileRefreshEpochRef.current
      const profile = cacheProfile || $activeGatewayProfile.get()
      const scope = cacheOwnerConnectionId ? { connectionId: cacheOwnerConnectionId, profile } : profile
      const scopeKey = platformDefaultScope(scope).key

      try {
        if (
          $activeSessionId.get() ||
          $selectedStoredSessionId.get() ||
          scopeKey !== platformDefaultScope($activeGatewayProfile.get()).key
        ) {
          return
        }

        const account = platformModelCatalog().account.get()

        if (account) {
          reconcilePlatformDraftAccount(account)
        }

        // Capture intent before any catalog I/O so a picker click that lands
        // while the platform list is loading wins over this refresh.
        const selectionGeneration = getComposerSelectionGeneration()

        // A manual pick stays sticky UNLESS it was removed from the catalog (its
        // model no longer exists on the provider), in which case keeping it would
        // 404 every new chat — fall through to reseed from the profile default.
        // Reads the model-options cache the composer already populated; an
        // unknown/not-yet-loaded catalog conservatively preserves the pick.
        const keepManualPick = () => {
          if (force || !$currentModel.get() || getCurrentModelSource() !== 'manual') {
            return false
          }

          const options = queryClient.getQueryData<ModelOptionsResponse>(
            modelOptionsQueryKey(cacheProfile || $activeGatewayProfile.get(), null, cacheOwnerConnectionId)
          )

          return (
            $currentProvider.get() === 'aino' ||
            !manualPickRemoved(options?.providers, $currentProvider.get(), $currentModel.get())
          )
        }

        if (keepManualPick()) {
          return
        }

        // Snapshot the selection generation before awaiting so a picker click
        // that lands while getGlobalModelInfo is in flight wins over this older
        // default — value comparisons alone miss re-selecting the same row.
        const resolved = await resolveModelDefault(scope)

        if (
          profileRefreshEpochRef.current !== profileRefreshEpoch ||
          $activeSessionId.get() ||
          $selectedStoredSessionId.get() ||
          scopeKey !== platformDefaultScope($activeGatewayProfile.get()).key ||
          getComposerSelectionGeneration() !== selectionGeneration ||
          keepManualPick()
        ) {
          return
        }

        const { model: resolvedModel, provider: resolvedProvider, platform: resolvedPlatformDefault } = resolved

        if (resolvedModel) {
          setCurrentModel(resolvedModel)
        }

        if (resolvedProvider) {
          setCurrentProvider(resolvedProvider)
        }

        if (resolvedModel || resolvedProvider) {
          setCurrentModelSource('default')

          if (resolvedPlatformDefault) {
            setCurrentPlatformOwner(resolvedPlatformDefault.ownerUserId)
          } else {
            setCurrentPlatformOwner('')
          }
        }
      } catch {
        // The delayed session.info event still updates this once the agent is ready.
      }
    },
    [cacheOwnerConnectionId, cacheProfile, queryClient]
  )

  const refreshAccountModel = useCallback(() => {
    const next = platformModelCatalog().account.get()
    const previous = handledAccountRef.current
    // Records the last handled transition, not a mirror used to read current
    // identity. Activity disconnects effects while the login window is open.
    handledAccountRef.current = next

    if (
      next?.phase === 'signed_in' &&
      (next.account?.id !== previous?.account?.id || next.mode !== previous?.mode || previous?.phase !== 'signed_in')
    ) {
      void refreshCurrentModel()
    }
  }, [refreshCurrentModel])

  useEffect(() => {
    refreshAccountModel()

    return platformModelCatalog().account.listen(refreshAccountModel)
  }, [refreshAccountModel])

  const selectModel = useCallback(
    (selection: ModelSelection): Promise<boolean> =>
      switchSessionModel({
        selection,
        queryClient,
        request: requestGateway,
        cache: updateModelOptionsCache,
        connectionId: cacheOwnerConnectionId,
        profile: cacheProfile || $activeGatewayProfile.get(),
        copy: {
          confirm: t.common.confirm,
          failed: copy.modelSwitchFailed,
          busy: t.platformModels?.switchBusy,
          recovery: t.platformModels?.switchRecovery,
          retry: t.platformModels?.retry
        }
      }),
    [
      cacheOwnerConnectionId,
      cacheProfile,
      copy.modelSwitchFailed,
      queryClient,
      requestGateway,
      t,
      updateModelOptionsCache
    ]
  )

  return { applySavedMainModel, refreshCurrentModel, selectModel }
}
