import { parseTurnBilling, type TurnBilling, turnBillingEquivalent } from './turn-billing'

export interface TurnMetrics {
  billing?: TurnBilling
  billing_source?: 'custom_provider'
  duration_s?: number
  session_elapsed_s?: number
  total_tokens?: number
  input_tokens?: number
  output_tokens?: number
  tokens_per_second?: number
  cache_hit_pct?: number
  context_percent?: number
  context_used?: number
  context_max?: number
  context_estimated?: boolean
}

const NUMBER_FIELDS = [
  'duration_s',
  'session_elapsed_s',
  'total_tokens',
  'input_tokens',
  'output_tokens',
  'tokens_per_second',
  'cache_hit_pct',
  'context_percent',
  'context_used',
  'context_max'
] as const

export function parseTurnMetrics(value: unknown): TurnMetrics | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {return undefined}
  const raw = value as Record<string, unknown>
  const metrics: TurnMetrics = {}

  for (const key of NUMBER_FIELDS) {
    const number = raw[key]

    if (typeof number === 'number' && Number.isFinite(number) && number >= 0) {metrics[key] = number}
  }

  const billing = parseTurnBilling(raw.billing)

  if (billing) {
    metrics.billing = billing
  } else if (raw.billing_source === 'custom_provider') {
    metrics.billing_source = raw.billing_source
  }

  if (!Object.keys(metrics).length) {return undefined}

  if (typeof raw.context_estimated === 'boolean') {metrics.context_estimated = raw.context_estimated}

  return metrics
}

export function turnMetricsEquivalent(a?: TurnMetrics, b?: TurnMetrics): boolean {
  return a === b || (NUMBER_FIELDS.every(key => a?.[key] === b?.[key]) && a?.context_estimated === b?.context_estimated &&
    a?.billing_source === b?.billing_source && turnBillingEquivalent(a?.billing, b?.billing))
}
