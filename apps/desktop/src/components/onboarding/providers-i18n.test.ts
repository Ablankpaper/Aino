import { afterEach, describe, expect, it } from 'vitest'

import { setRuntimeI18nLocale } from '@/i18n'
import { makeOAuthProvider } from '@/test/oauth-provider'

import { providerTitle } from './providers'

afterEach(() => {
  setRuntimeI18nLocale('en')
})

describe('onboarding provider labels', () => {
  it('uses Simplified Chinese for known OAuth provider labels', () => {
    setRuntimeI18nLocale('zh')

    expect(providerTitle(makeOAuthProvider('nous', 'Nous Portal'))).toBe('Nous Portal')
    expect(providerTitle(makeOAuthProvider('openai-codex', 'OpenAI Codex / ChatGPT'))).toBe('ChatGPT 或 Codex 订阅')
    expect(providerTitle(makeOAuthProvider('anthropic', 'Anthropic Claude'))).toBe('Anthropic API 密钥')
    expect(providerTitle(makeOAuthProvider('claude-code', 'Claude Code'))).toBe(
      'Anthropic OAuth：使用订阅需要额外使用额度'
    )
  })

  it('keeps unknown provider names from the gateway unchanged', () => {
    setRuntimeI18nLocale('zh')

    expect(providerTitle(makeOAuthProvider('custom-provider', '自定义提供方'))).toBe('自定义提供方')
  })
})
