import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useI18n } from '@/i18n'
import { ChevronLeft, ChevronRight, RefreshCw } from '@/lib/icons'

import type {
  PlatformBillingBridge,
  PlatformBillingScope,
  PlatformOrderPage,
  PlatformUsagePage
} from '../../../../shared/platform-contract'

import { formatUsageAmount, UsageView } from './usage-view'

interface BillingHistoryProps {
  bridge: PlatformBillingBridge
  scope: PlatformBillingScope
  onOpenOrder: (orderId: string) => void
}

export function BillingHistory({ bridge, scope, onOpenOrder }: BillingHistoryProps) {
  const { t, locale } = useI18n()
  const copy = t.platformBillingHistory
  const [mode, setMode] = useState<'orders' | 'usage'>('orders')
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)

  const [result, setResult] = useState<{
    key: string
    data: PlatformOrderPage | PlatformUsagePage | null
    error: boolean
  }>({ key: '', data: null, error: false })

  const key = JSON.stringify([scope.origin, scope.user_id, scope.generation, mode, page, retry])
  const origin = scope.origin
  const owner = scope.user_id
  const generation = scope.generation

  useEffect(() => {
    if (!expanded) {
      return
    }

    let alive = true

    const load = async () => {
      if (document.visibilityState === 'hidden') {
        return
      }

      try {
        const query = { expected_user_id: owner, page, page_size: 20 }
        const data = mode === 'orders' ? await bridge.listOrders(query) : await bridge.listUsage(query)
        const current = await bridge.scope({ expected_user_id: owner })

        if (
          current.origin !== origin ||
          current.user_id !== owner ||
          current.generation !== generation ||
          data.page !== page ||
          data.page_size !== 20
        ) {
          throw new Error('scope_or_page_changed')
        }

        if (alive) {
          setResult({ key, data, error: false })
        }
      } catch {
        if (alive) {
          setResult({ key, data: null, error: true })
        }
      }
    }

    void load()

    const visible = () => {
      if (document.visibilityState !== 'hidden') {
        void load()
      }
    }

    document.addEventListener('visibilitychange', visible)

    return () => {
      alive = false
      document.removeEventListener('visibilitychange', visible)
    }
  }, [bridge, expanded, generation, key, mode, origin, owner, page])

  const data = result.key === key ? result.data : null
  const error = result.key === key && result.error

  return (
    <section className="my-6 min-w-0">
      <SegmentedControl
        onChange={value => {
          setMode(value)
          setPage(1)
          setExpanded(true)
        }}
        options={[
          { id: 'orders', label: copy.orders },
          { id: 'usage', label: copy.usage }
        ]}
        value={mode}
      />
      {expanded && (
        <div className="mt-4 min-w-0">
          {error ? (
            <div className="flex flex-wrap items-center gap-3 text-sm" role="alert">
              <span>{copy.error}</span>
              <Button onClick={() => setRetry(value => value + 1)} size="sm" variant="ghost">
                <RefreshCw />
                {copy.retry}
              </Button>
            </div>
          ) : !data ? (
            <Loader />
          ) : (
            <>
              {mode === 'usage' ? (
                <UsageView rows={(data as PlatformUsagePage).items} />
              ) : data.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{copy.empty}</p>
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {(data as PlatformOrderPage).items.map(order => (
                    <li key={order.order_id}>
                      <Button
                        className="w-full justify-between text-left"
                        onClick={() => onOpenOrder(order.order_id)}
                        variant="ghost"
                      >
                        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                          {order.out_trade_no}
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString(locale)} ·{' '}
                            {t.platformRecharge.status[order.status]}
                          </span>
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          {formatUsageAmount(order.pay_amount)} {order.payment_currency}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  aria-label={copy.previous}
                  disabled={page <= 1}
                  onClick={() => setPage(value => value - 1)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <ChevronLeft />
                </Button>
                <span className="text-xs tabular-nums">{page}</span>
                <Button
                  aria-label={copy.next}
                  disabled={page * 20 >= data.total}
                  onClick={() => setPage(value => value + 1)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <ChevronRight />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
