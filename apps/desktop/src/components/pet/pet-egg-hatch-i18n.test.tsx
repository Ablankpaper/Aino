// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'

import { PetEggHatch, PetProgress } from './pet-egg-hatch'

afterEach(cleanup)

describe('pet hatch localization', () => {
  it('localizes progress accessibility text and the default cancel action', () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <PetProgress />
        <PetEggHatch onCancel={vi.fn()} />
      </I18nProvider>
    )

    expect(screen.getByLabelText('孵化进度')).toBeTruthy()
    expect(screen.getByRole('button', { name: '取消' })).toBeTruthy()
    expect(screen.queryByLabelText('Hatching progress')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })
})
