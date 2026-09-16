import { describe, expect, it } from 'vitest'

import { chatMessagesEquivalent } from '@/app/session/hooks/use-session-actions/utils'
import { toRuntimeMessage } from '@/lib/chat-runtime'

import { toChatMessages } from './hydration'

describe('reply metrics hydration', () => {
  it('keeps final reply metrics when tool activity is merged and publishes them to the renderer', () => {
    const metrics = { duration_s: 12, total_tokens: 1600, session_elapsed_s: 100 }

    const messages = toChatMessages([
      { role: 'user', content: 'question' },
      {
        role: 'assistant',
        content: 'Checking.',
        tool_calls: [{ id: 'tool-1', type: 'function', function: { name: 'terminal', arguments: '{}' } }]
      },
      { role: 'assistant', content: 'Done.', display_metadata: { turn_metrics: metrics } }
    ])

    const reply = messages.at(-1)!
    expect(reply.turnMetrics).toEqual(metrics)
    expect(toRuntimeMessage(reply).metadata?.custom?.turnMetrics).toEqual(metrics)
    expect(chatMessagesEquivalent(reply, { ...reply, turnMetrics: { ...metrics } })).toBe(true)
    expect(chatMessagesEquivalent(reply, { ...reply, turnMetrics: { ...metrics, total_tokens: 1800 } })).toBe(false)
  })

  it('leaves old or malformed metrics absent instead of inventing historical usage', () => {
    const [old, malformed] = toChatMessages([
      { role: 'assistant', content: 'Old reply.' },
      {
        role: 'assistant',
        content: 'Bad metadata.',
        display_metadata: { turn_metrics: { duration_s: -1, total_tokens: '500' } }
      }
    ])

    expect(old.turnMetrics).toBeUndefined()
    expect(malformed.turnMetrics).toBeUndefined()
  })

  it('preserves only an explicit custom-provider billing source through history and equality', () => {
    const [old, custom, malformed] = toChatMessages([
      { role: 'assistant', content: 'Old reply.', display_metadata: { turn_metrics: { duration_s: 2 } } },
      {
        role: 'assistant',
        content: 'Custom reply.',
        display_metadata: { turn_metrics: { duration_s: 3, billing_source: 'custom_provider' } }
      },
      {
        role: 'assistant',
        content: 'Unknown reply.',
        display_metadata: { turn_metrics: { duration_s: 4, billing_source: 'current_model' } }
      }
    ])

    expect(old.turnMetrics).toEqual({ duration_s: 2 })
    expect(custom.turnMetrics).toEqual({ duration_s: 3, billing_source: 'custom_provider' })
    expect(malformed.turnMetrics).toEqual({ duration_s: 4 })
    expect(chatMessagesEquivalent(custom, { ...custom, turnMetrics: { ...custom.turnMetrics } })).toBe(true)
    expect(chatMessagesEquivalent(custom, {
      ...custom,
      turnMetrics: { duration_s: 3 }
    })).toBe(false)
  })
})
