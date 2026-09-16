import type { ClientSessionState } from '@/app/types'
import { parseTurnBilling, sameTurnBillingOwner, type TurnBilling } from '@/lib/turn-billing'

function applyReceipt(state: ClientSessionState, billing: TurnBilling): ClientSessionState | undefined {
  const index = state.messages.findIndex(message => message.turnMetrics?.billing?.turn_id === billing.turn_id)

  if (index < 0) { return undefined }
  const message = state.messages[index]
  const current = message.turnMetrics!.billing!

  if (!sameTurnBillingOwner(current, billing) || current.revision >= billing.revision) { return state }
  const messages = state.messages.slice()
  messages[index] = { ...message, turnMetrics: { ...message.turnMetrics, billing } }

  return { ...state, messages }
}

export function receiveReplyBilling(state: ClientSessionState, raw: unknown): ClientSessionState {
  const billing = parseTurnBilling(raw)

  if (!billing) { return state }
  const applied = applyReceipt(state, billing)

  if (applied) { return applied }
  const previous = state.pendingReplyBilling?.[billing.turn_id]

  if (previous && (!sameTurnBillingOwner(previous, billing) || previous.revision >= billing.revision)) { return state }
  // A title can finish between persisting a reply and publishing message.complete.
  const pending = { ...state.pendingReplyBilling, [billing.turn_id]: billing }

  return { ...state, pendingReplyBilling: Object.fromEntries(Object.entries(pending).slice(-32)) }
}

export function flushReplyBilling(state: ClientSessionState): ClientSessionState {
  let next = state

  for (const [turn, billing] of Object.entries(state.pendingReplyBilling ?? {})) {
    const applied = applyReceipt(next, billing)

    if (!applied) { continue }
    const pending = { ...applied.pendingReplyBilling }
    delete pending[turn]
    next = { ...applied, pendingReplyBilling: pending }
  }

  return next
}
