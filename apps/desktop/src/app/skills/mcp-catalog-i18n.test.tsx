// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { McpCatalogEntry } from '@/hermes'
import { I18nProvider } from '@/i18n'

import { McpCatalog } from './mcp-tab'

const entries: McpCatalogEntry[] = [
  {
    name: 'oauth-server',
    description: 'An OAuth server',
    source: 'test',
    transport: 'http',
    auth_type: 'oauth',
    required_env: [],
    command: null,
    args: [],
    url: 'https://example.com/oauth',
    install_url: null,
    install_ref: null,
    bootstrap: [],
    default_enabled: null,
    post_install: '',
    needs_install: false,
    installed: false,
    enabled: false
  },
  {
    name: 'key-server',
    description: 'An API key server',
    source: 'test',
    transport: 'stdio',
    auth_type: 'api_key',
    required_env: [],
    command: 'node',
    args: [],
    url: null,
    install_url: null,
    install_ref: null,
    bootstrap: [],
    default_enabled: null,
    post_install: '',
    needs_install: false,
    installed: false,
    enabled: false
  }
]

afterEach(() => {
  cleanup()
})

describe('MCP catalog localization', () => {
  it('renders localized authentication tags for Simplified Chinese users', () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <McpCatalog entries={entries} loading={false} onInstalled={() => {}} />
      </I18nProvider>
    )

    expect(screen.getByText('OAuth')).toBeTruthy()
    expect(screen.getByText('API 密钥')).toBeTruthy()
    expect(screen.queryByText('API key')).toBeNull()
  })
})
