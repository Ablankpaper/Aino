// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { HermesBranchPullRequest } from '@/global'
import { I18nProvider } from '@/i18n'

vi.mock('@/store/pull-requests', () => ({
  pullRequestBucket: () => 'open'
}))

const { PrTag } = await import('./pr-tag')

const pr: HermesBranchPullRequest = {
  branch: 'feature/localization',
  draft: false,
  number: 42,
  state: 'open',
  title: 'Localize desktop labels',
  url: 'https://example.com/pull/42'
}

afterEach(cleanup)

describe('PrTag localization', () => {
  it('uses Simplified Chinese for the pull-request accessibility name', () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <PrTag pr={pr} />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: '打开拉取请求 #42' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Open pull request #42' })).toBeNull()
  })
})
