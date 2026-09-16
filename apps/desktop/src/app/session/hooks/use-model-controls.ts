import { type QueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'

import { bindSelectedPlatformSession, clearPlatformSession } from '@/api/platform-session-binding'
import type { ModelSelection } from '@/app/shell/model-menu-panel'
import { getGlobalModelInfo } from '@/hermes'
import { useI18n } from '@/i18n'
import { isBusySessionModelSwitch } from '@/lib/gateway-rpc'
import { surfaceModelSwitchConfirm } from '@/lib/guarded-model-switch'
import { manualPickRemoved, modelOptionsQueryKey } from '@/lib/model-options'
import { notifyError } from '@/store/notifications'
import { platformModelCatalog, readPlatformDefault, requirePlatformSelection } from '@/store/platform-models'
import { $activeGatewayProfile } from '@/store/profile'
import {
  $activeSessionId,
  $currentModel,
  $currentPlatformDefaultResolution,
  $currentPlatformOwner,
  $currentProvider,
  getComposerSelectionGeneration,
  getCurrentModelSource,
  markComposerSelectionManual,
  setCurrentModel,
  setCurrentModelSource,
  setCurrentPlatformDefaultResolution,
  setCurrentProvider
} from '@/store/session'
import { setCurrentPlatformOwner } from '@/store/session'
import { $sessionStates, sessionTileDelegate } from '@/store/session-states'
import type { ModelOptionsResponse } from '@/types/hermes'

interface ModelControlsOptions {
  cacheOwnerConnectionId?: string
  cacheProfile?: string
  queryClient: QueryClient
  requestGateway: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>
}

interface ModelSwitchResponse {
  confirm_message?: string
  confirm_required?: boolean
  deferred?: boolean
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

      setCurrentPlatformDefaultResolution(null)
      setCurrentModelSource('default')

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
      const profile = $activeGatewayProfile.get()

      try {
        if ($activeSessionId.get()) {
          return
        }

        // Capture intent before any catalog I/O so a picker click that lands
        // while the platform list is loading wins over this refresh.
        const selectionGeneration = getComposerSelectionGeneration()

        // A signed-in Aino account owns the default for fresh drafts. Load its
        // catalog alongside the existing gateway default lookup; an empty
        // gateway model is intentional for newly provisioned profiles and must
        // not leave the composer blank when a platform default is available.
        const platformCatalog = platformModelCatalog()
        await platformCatalog.load()

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
        const result = await getGlobalModelInfo(profile)

        if (
          profileRefreshEpochRef.current !== profileRefreshEpoch ||
          $activeSessionId.get() ||
          getComposerSelectionGeneration() !== selectionGeneration ||
          keepManualPick()
        ) {
          return
        }

        const accountId = platformCatalog.account.get()?.account?.id || ''
        const preferredId = readPlatformDefault(accountId)

        const platformDefault =
          platformCatalog.state.get().phase === 'ready'
            ? platformCatalog.state
                .get()
                .models.find(model => model.state === 'available' && model.id === preferredId) ||
              platformCatalog.state.get().models.find(model => model.is_default && model.state === 'available')
            : undefined

        const resolvedModel = result.model || (result.provider ? '' : platformDefault?.id || '')
        const resolvedProvider = result.provider || (resolvedModel ? 'aino' : '')

        const resolvedPlatformDefault =
          !result.model && !result.provider && resolvedProvider === 'aino' && platformDefault?.id === resolvedModel
            ? {
                modelId: resolvedModel,
                ownerUserId: platformCatalog.account.get()?.account?.id || ''
              }
            : null

        if (resolvedModel) {
          setCurrentModel(resolvedModel)
        }

        if (resolvedProvider) {
          setCurrentProvider(resolvedProvider)
        }

        if (resolvedModel || resolvedProvider) {
          setCurrentModelSource('default')
          setCurrentPlatformDefaultResolution(resolvedPlatformDefault)

          if (resolvedPlatformDefault) {
            setCurrentPlatformOwner(resolvedPlatformDefault.ownerUserId)
          }
        } else {
          setCurrentPlatformDefaultResolution(null)
        }
      } catch {
        // The delayed session.info event still updates this once the agent is ready.
      }
    },
    [cacheOwnerConnectionId, cacheProfile, queryClient]
  )

  // Returns whether the switch was applied so callers can await it before
  // applying follow-up changes. `true` means applied (or deferred/busy-queued
  // for the next turn). `false` means NOT applied — either pending
  // confirmation (warning with Confirm action already shown, pill rolled back)
  // or a real failure (error toast). Callers must NOT treat `false` as a
  // generic failure: for `pending` the gateway intentionally returned
  // `confirm_required` and no error should be surfaced.
  // The composer model is plain UI state: with no live session it's just
  // stored (and shipped on the next session.create); with one it's scoped to
  // that session via config.set. It NEVER writes the profile default — that
  // lives in Settings → Model — so picking a model here can't silently mutate
  // global config.
  //
  // `selection.sessionId` targets a specific surface (tile). When omitted, the
  // primary `$activeSessionId` is used (overlay / legacy callers). A tile
  // switch must not touch the primary globals — and must not be blocked by a
  // busy primary turn.
  const selectModel = useCallback(
    async (selection: ModelSelection): Promise<boolean> => {
      const primaryRuntimeId = $activeSessionId.get()
      const liveSessionId = 'sessionId' in selection ? (selection.sessionId ?? null) : primaryRuntimeId
      const touchesPrimary = !liveSessionId || liveSessionId === primaryRuntimeId

      const prevModel = touchesPrimary ? $currentModel.get() : ($sessionStates.get()[liveSessionId!]?.model ?? '')

      const prevProvider = touchesPrimary
        ? $currentProvider.get()
        : ($sessionStates.get()[liveSessionId!]?.provider ?? '')

      const prevSource = getCurrentModelSource()
      const prevPlatformDefaultResolution = $currentPlatformDefaultResolution.get()
      const prevPlatformOwner = $currentPlatformOwner.get()
      const liveGatewayProfile = cacheProfile || $activeGatewayProfile.get()
      const catalog = platformModelCatalog()
      const account = catalog.account.get()
      const platformOwner = account?.account?.id || ''

      const owner = cacheOwnerConnectionId
        ? { connectionId: cacheOwnerConnectionId, profile: liveGatewayProfile }
        : liveGatewayProfile

      if (selection.provider === 'aino') {
        try {
          requirePlatformSelection(account, catalog.state.get().models, selection.model, platformOwner)
        } catch (error) {
          notifyError(error, copy.modelSwitchFailed)

          return false
        }
      }

      let platformStaged = false

      const paintSelection = () => {
        if (touchesPrimary) {
          setCurrentModel(selection.model)
          setCurrentProvider(selection.provider)

          if (selection.provider === 'aino') {
            setCurrentPlatformOwner(platformOwner)
          }

          markComposerSelectionManual()
        } else if (liveSessionId) {
          // Optimistic tile paint — session.info will confirm; rollback on error.
          sessionTileDelegate()?.updateSession(liveSessionId, state => ({
            ...state,
            model: selection.model,
            provider: selection.provider,
            platformModel:
              selection.provider === 'aino'
                ? { modelId: selection.model, ownerUserId: platformOwner, status: 'awaiting_managed_credentials' }
                : null
          }))
        }
      }

      const cacheSelection = (provider: string, model: string) => {
        updateModelOptionsCache(liveSessionId, provider, model, touchesPrimary && !liveSessionId, liveGatewayProfile)
      }

      const rollbackSelection = () => {
        if (touchesPrimary) {
          setCurrentModel(prevModel)
          setCurrentProvider(prevProvider)
          setCurrentModelSource(prevSource)
          setCurrentPlatformDefaultResolution(prevPlatformDefaultResolution)
          setCurrentPlatformOwner(prevPlatformOwner)
        } else if (liveSessionId) {
          sessionTileDelegate()?.updateSession(liveSessionId, state => ({
            ...state,
            model: prevModel,
            provider: prevProvider
          }))
        }

        cacheSelection(prevProvider, prevModel)
      }

      paintSelection()
      cacheSelection(selection.provider, selection.model)

      // No live session yet: the pick is pure UI state. session.create reads
      // $currentModel/$currentProvider and applies it as that session's override.
      if (!liveSessionId) {
        return true
      }

      // The PRIMARY profile's main agent lets the gateway decide persistence
      // (resolve_persist_behavior): session-only by default, persisted when
      // model.persist_switch_by_default is true or when no default has ever
      // been configured (the first-ever pick, so resolve_provider never falls
      // through to a leftover OPENAI_API_KEY env var — #86414). A plain pick
      // no longer silently rewrites config.yaml (#90235); Settings → Model
      // remains the explicit "set as default" door.
      //
      // Two things stay --session, deliberately:
      //  - a SECONDARY chat tile: picking a model there must not rewrite the
      //    profile default (the cross-session-contamination guard).
      //  - MoA (mixture-of-agents) presets: a transient orchestration choice
      //    that must never become the persisted global gateway default.
      const isSessionOnlyPreset = (selection.provider || '').toLowerCase() === 'moa'
      const scope = touchesPrimary && !isSessionOnlyPreset && prevProvider !== 'aino' ? '' : ' --session'

      const requestSwitch = async (confirmExpensiveModel = false) => {
        const result = await requestGateway<ModelSwitchResponse>('config.set', {
          session_id: liveSessionId,
          key: 'model',
          ...(selection.provider === 'aino'
            ? { value: selection.model, model_source: 'aino' }
            : { value: `${selection.model} --provider ${selection.provider}${scope}` }),
          ...(confirmExpensiveModel ? { confirm_expensive_model: true } : {})
        })

        if (!result?.confirm_required && !result?.deferred) {
          if (selection.provider === 'aino') {
            platformStaged = true

            const platformModel = {
              modelId: selection.model,
              ownerUserId: platformOwner,
              status: 'awaiting_managed_credentials' as const
            }

            sessionTileDelegate()?.updateSession(liveSessionId, state => ({
              ...state,
              provider: 'aino',
              model: selection.model,
              platformModel
            }))
            await bindSelectedPlatformSession(owner, liveSessionId, platformModel, requestGateway)
            sessionTileDelegate()?.updateSession(liveSessionId, state => ({
              ...state,
              platformModel: { ...platformModel, status: 'ready' }
            }))
          } else if (prevProvider === 'aino') {
            await clearPlatformSession(owner, liveSessionId)
          }
        }

        return result
      }

      const finishSwitch = (result: ModelSwitchResponse | undefined) => {
        // A pick made DURING a turn is queued by the gateway and applied at the
        // next turn start (`deferred`). Re-fetching now would answer with the
        // model still running and repaint the old name over the user's choice —
        // the switch publishes session.info when it lands, and that is what
        // re-syncs every surface.
        if (!result?.deferred) {
          void queryClient.invalidateQueries({
            queryKey: modelOptionsQueryKey(liveGatewayProfile, liveSessionId, cacheOwnerConnectionId)
          })
        }
      }

      try {
        const result = await requestSwitch()

        if (result?.confirm_required) {
          rollbackSelection()
          // ONE shared applier for guarded switches (#95293): the same
          // confirm flow the Bots editor routes through — never fork this
          // logic per surface.
          surfaceModelSwitchConfirm({
            confirmLabel: t.common.confirm,
            confirmMessage: result.confirm_message,
            failureMessage: copy.modelSwitchFailed,
            finish: finishSwitch,
            // Staleness guard — the warning can linger while the user picks
            // a different model or switches sessions. Clicking Confirm must
            // not clobber the newer choice: bail if the live state no longer
            // matches the snapshot this notification was created for.
            isStale: () =>
              touchesPrimary
                ? $activeSessionId.get() !== liveSessionId ||
                  $currentModel.get() !== prevModel ||
                  $currentProvider.get() !== prevProvider
                : !liveSessionId ||
                  $sessionStates.get()[liveSessionId]?.model !== prevModel ||
                  $sessionStates.get()[liveSessionId]?.provider !== prevProvider,
            repaint: () => {
              paintSelection()
              cacheSelection(selection.provider, selection.model)
            },
            requestConfirmed: () => requestSwitch(true),
            rollback: () => {
              if (!platformStaged) {
                rollbackSelection()
              }
            }
          })

          return false
        }

        finishSwitch(result)

        return true
      } catch (err) {
        // An OLDER gateway refuses a mid-turn switch outright (4009) instead of
        // deferring it. Don't punish the user for a backend they haven't
        // updated: keep the pick painted as the composer's selection, which is
        // what the NEXT turn runs anyway. Current gateways never take this
        // path — they answer `deferred`.
        if (selection.provider !== 'aino' && isBusySessionModelSwitch(err)) {
          return true
        }

        if (!platformStaged) {
          rollbackSelection()
        }

        notifyError(err, copy.modelSwitchFailed)

        return false
      }
    },
    [
      cacheOwnerConnectionId,
      cacheProfile,
      copy.modelSwitchFailed,
      queryClient,
      requestGateway,
      t.common.confirm,
      updateModelOptionsCache
    ]
  )

  return { applySavedMainModel, refreshCurrentModel, selectModel }
}
