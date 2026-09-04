// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'

import { Intro } from './intro'

afterEach(() => {
  cleanup()
})

describe('empty chat intro localization', () => {
  it('renders Simplified Chinese copy for a Chinese locale', () => {
    const { container } = render(
      <I18nProvider configClient={null} initialLocale="zh">
        <Intro personality="none" seed={0} />
      </I18nProvider>
    )

    const text = container.textContent ?? ''

    expect(text).toMatch(/[\u4e00-\u9fff]/u)
    expect(text).not.toMatch(/Ask a question|Describe the task|Drop a file|Search the repo|Type a task/u)
  })

  it('renders the Aino home layout and routes every quick action to its existing handler', () => {
    const onPickFiles = vi.fn()
    const onInsertPrompt = vi.fn()
    const onSelectWorkspace = vi.fn()

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <Intro
          onInsertPrompt={onInsertPrompt}
          onPickFiles={onPickFiles}
          onSelectWorkspace={onSelectWorkspace}
          personality="none"
          seed={0}
        />
      </I18nProvider>
    )

    expect(screen.getByRole('heading', { name: 'AINO AGENT' })).toBeTruthy()
    expect(screen.getByText('丢一个文件路径、堆栈跟踪或粗略想法。我会调查、建议下一步，并保持操作可逆。')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '分析文档' }))
    expect(onPickFiles).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '审查代码' }))
    expect(onInsertPrompt).toHaveBeenCalledWith('请审查当前代码，找出问题并给出可执行的优化建议。')
    expect(
      screen.getByRole('button', { name: '审查代码' }).querySelector('[data-aino-design-icon]')
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '研究主题' }))
    expect(onInsertPrompt).toHaveBeenCalledWith('请深入研究这个主题，并整理出关键结论与可靠来源。')

    fireEvent.click(screen.getByRole('button', { name: '生成报告' }))
    expect(onInsertPrompt).toHaveBeenCalledWith('请根据当前上下文生成一份结构化报告。')

    fireEvent.click(screen.getByRole('button', { name: '在工作区中工作' }))
    expect(onSelectWorkspace).toHaveBeenCalledTimes(1)
  })
})
