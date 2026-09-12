import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'
import { Activity } from '@/lib/icons'
import { $projectTree } from '@/store/projects'
import { $currentBranch, $currentModel, $selectedStoredSessionId } from '@/store/session'

import { SummarySection } from './summary-section'

import { SummaryPane } from './index'

function renderSummary() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

  return render(
    <I18nProvider configClient={null} initialLocale="zh">
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <SummaryPane />
        </QueryClientProvider>
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('SummaryPane', () => {
  it('renders accessible summary and section headings inside the wired content', () => {
    renderSummary()

    expect(screen.getByRole('complementary', { name: '会话摘要' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '会话摘要' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '环境信息' })).toBeTruthy()
  })

  it('keeps model information visible when no project owns the session cwd', () => {
    $projectTree.set([])
    $selectedStoredSessionId.set('session-without-project')
    $currentBranch.set('launch-directory-branch')
    $currentModel.set('test-model')

    renderSummary()

    expect(screen.getAllByText('未打开项目').length).toBeGreaterThan(0)
    expect(screen.getByText('test-model')).toBeTruthy()
    const environment = screen.getByRole('heading', { name: '环境信息' }).closest('section')

    expect(environment).toBeTruthy()
    expect(within(environment!).queryByText('工作目录')).toBeNull()
    expect(within(environment!).queryByText('分支')).toBeNull()
    expect(within(environment!).queryByText('launch-directory-branch')).toBeNull()
  })
})

describe('SummarySection', () => {
  it('shows an error retry action without replacing the whole pane', () => {
    const retry = vi.fn()

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <SummarySection error="不可用" icon={Activity} onRetry={retry} state="error" title="系统资源">
          <span>不会显示在错误态中</span>
        </SummarySection>
      </I18nProvider>
    )

    expect(screen.getByText('不可用')).toBeTruthy()
    expect(screen.queryByText('不会显示在错误态中')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
