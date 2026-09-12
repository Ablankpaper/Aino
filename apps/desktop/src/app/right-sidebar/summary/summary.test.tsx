import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'
import { Activity } from '@/lib/icons'

import { SummaryPane } from './index'
import { SummarySection } from './summary-section'

function renderSummary() {
  return render(
    <I18nProvider configClient={null} initialLocale="zh">
      <MemoryRouter>
        <SummaryPane requestGateway={vi.fn()} />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('SummaryPane', () => {
  it('renders the title, close button, and stable section headings', () => {
    renderSummary()

    expect(screen.getByRole('complementary', { name: '会话摘要' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '关闭摘要' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '环境信息' })).toBeTruthy()
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
