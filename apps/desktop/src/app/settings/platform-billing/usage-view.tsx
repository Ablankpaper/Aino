import { useI18n } from '@/i18n'

import type { PlatformUsageRow } from '../../../../shared/platform-contract'

interface UsageViewProps {
  rows: PlatformUsageRow[]
  truncated?: boolean
}

export function formatUsageAmount(amount: string): string {
  const [whole, fraction = ''] = amount.split('.')
  const trimmed = fraction.replace(/0+$/, '')

  return trimmed ? `${whole}.${trimmed}` : whole
}

export function UsageView({ rows, truncated = false }: UsageViewProps) {
  const { t } = useI18n()
  const copy = t.platformUsage

  const statuses = {
    settled: copy.recordSettled,
    not_charged: copy.notCharged,
    pending: copy.pending,
    unknown: copy.unverified
  }

  return (
    <div className="min-w-0 text-sm">
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul aria-label={copy.details} className="m-0 list-none space-y-4 p-0">
          {rows.map(row => {
            const purpose = row.desktop_purpose as keyof typeof copy.purposes

            const amount =
              row.settlement_status === 'settled' || row.settlement_status === 'not_charged'
                ? row.actual_cost_decimal
                : null

            return (
              <li className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1" key={row.id}>
                <span className="min-w-0 [overflow-wrap:anywhere]">{row.model}</span>
                <span className="text-right tabular-nums [overflow-wrap:anywhere]">
                  {amount === null ? copy.unverified : `${formatUsageAmount(amount)} USD`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {copy.purposes[purpose] ?? copy.purposes.other_auxiliary}
                </span>
                <span className="text-right text-xs text-muted-foreground">{statuses[row.settlement_status]}</span>
              </li>
            )
          })}
        </ul>
      )}
      {truncated && <p className="mt-3 text-xs text-muted-foreground">{copy.truncated}</p>}
    </div>
  )
}
