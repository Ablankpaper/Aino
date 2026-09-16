import { useStore } from '@nanostores/react'
import { atom } from 'nanostores'
import { useEffect, useState } from 'react'

import { platformAccountActions } from '@/api/platform'

import type {
  PlatformAccountSnapshot,
  PlatformBillingScope,
  PlatformWalletSummary
} from '../../../../shared/platform-contract'

const unavailable = atom<PlatformAccountSnapshot | null>(null)

interface WalletResult {
  key: string
  wallet: PlatformWalletSummary | null
  error: string | null
  loading: boolean
  scope: PlatformBillingScope | null
}

export function useWallet() {
  const desktop = window.hermesDesktop
  const bridge = desktop?.platformBilling

  const snapshot = useStore(
    desktop?.platformAccount ? platformAccountActions(desktop.platformAccount).snapshot : unavailable
  )

  const owner = snapshot?.account?.id
  const available = Boolean(owner && bridge && ['signed_in', 'offline'].includes(snapshot?.phase ?? ''))
  // Read failures publish account revisions too; they must not trigger another read.
  const key = `${snapshot?.mode}:${owner}:${available}`
  const [refresh, setRefresh] = useState(0)
  const [result, setResult] = useState<WalletResult>({ key: '', wallet: null, error: null, loading: true, scope: null })

  useEffect(() => {
    if (!available || !owner || !bridge) {
      return
    }

    let alive = true
    let inflight = false
    let lastRead = 0

    const read = async () => {
      if (!alive || inflight || document.visibilityState === 'hidden') {
        return
      }

      inflight = true
      lastRead = Date.now()
      setResult(previous => ({
        scope: previous.key === key ? previous.scope : null,
        key,
        wallet: previous.key === key ? previous.wallet : null,
        error: null,
        loading: true
      }))

      try {
        const input = { expected_user_id: owner }
        const scope = await bridge.scope(input)
        const wallet = await bridge.summary(input)
        const current = await bridge.scope(input)

        if (
          scope.origin !== current.origin ||
          scope.user_id !== current.user_id ||
          scope.generation !== current.generation
        ) {
          throw Object.assign(new Error('platform_account_changed'), { code: 'platform_account_changed' })
        }

        if (alive) {
          setResult({ key, wallet, error: null, loading: false, scope: current })
        }
      } catch (error) {
        const code =
          error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
            ? error.code
            : 'network_error'

        if (alive) {
          setResult({ key, wallet: null, error: code, loading: false, scope: null })
        }
      } finally {
        inflight = false
      }
    }

    const visible = () => {
      if (Date.now() - lastRead >= 5000) {
        void read()
      }
    }

    void read()
    document.addEventListener('visibilitychange', visible)

    return () => {
      alive = false
      document.removeEventListener('visibilitychange', visible)
    }
  }, [available, bridge, key, owner, refresh])

  return {
    scope: available && result.key === key ? result.scope : null,
    available,
    wallet: available && result.key === key ? result.wallet : null,
    error: available && result.key === key ? result.error : null,
    loading: available && (result.key !== key || result.loading),
    refresh: () => setRefresh(value => value + 1)
  }
}
