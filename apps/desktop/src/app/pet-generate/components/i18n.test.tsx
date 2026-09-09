import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'

import { EmptyHint } from './empty-hint'
import { GenerateUnavailable } from './generate-unavailable'

function renderZh(node: ReactNode) {
  return render(
    <I18nProvider configClient={null} initialLocale="zh">
      {node}
    </I18nProvider>
  )
}

describe('pet generation Simplified Chinese copy', () => {
  it('localizes the unavailable setup guidance', () => {
    renderZh(<GenerateUnavailable onSetup={vi.fn()} />)

    expect(screen.getByText('添加图像提供方以生成宠物')).toBeTruthy()
    expect(screen.getByText('孵化自定义宠物需要能够使用参考图的提供方。')).toBeTruthy()
    expect(screen.getByRole('button', { name: '设置图像生成' })).toBeTruthy()
    expect(screen.getByText('从以下位置获取密钥')).toBeTruthy()
  })

  it('localizes example labels while preserving the model prompt payload', () => {
    const onExample = vi.fn()
    renderZh(<EmptyHint onExample={onExample} />)

    fireEvent.click(screen.getByRole('button', { name: '奶茶水獭' }))

    expect(onExample).toHaveBeenCalledWith('a bubble-tea otter')
  })
})
