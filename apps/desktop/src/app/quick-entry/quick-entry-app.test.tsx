import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'

import { QuickEntryApp } from './quick-entry-app'

const desktopWindow = window as unknown as { hermesDesktop?: Window['hermesDesktop'] }

beforeEach(() => {
  desktopWindow.hermesDesktop = {
    quickEntry: {
      dismiss: vi.fn(),
      onShown: vi.fn(() => () => {}),
      onState: vi.fn(() => () => {}),
      submit: vi.fn()
    }
  } as unknown as Window['hermesDesktop']
})

afterEach(() => {
  cleanup()
  delete desktopWindow.hermesDesktop
})

describe('QuickEntryApp localization', () => {
  it('uses Simplified Chinese labels and target options', () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <QuickEntryApp />
      </I18nProvider>
    )

    expect(screen.getByRole('textbox', { name: '快速输入' })).toBeTruthy()
    expect(screen.getByPlaceholderText('未连接 — 打开 Aino 以重新连接')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '目标会话' })).toBeTruthy()
    expect(screen.getByText('发送到')).toBeTruthy()
    expect(screen.getByRole('option', { name: '当前对话' })).toBeTruthy()
    expect(screen.getByRole('option', { name: '新建会话' })).toBeTruthy()
  })
})
