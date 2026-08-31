// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'
import { $petInfo } from '@/store/pet'

const control = vi.fn()

vi.mock('@/components/chat/vibe-hearts', () => ({
  PetHeartField: () => null,
  playVibeHearts: vi.fn()
}))
vi.mock('@/components/pet/pet-bubble', () => ({ PetBubble: () => null }))
vi.mock('@/components/pet/pet-sprite', () => ({ PetSprite: () => null }))
vi.mock('@/components/pet/use-pet-zoom-gesture', () => ({ usePetZoomGesture: vi.fn() }))

import { PetOverlayApp } from './pet-overlay-app'

const info = {
  enabled: true,
  frameH: 208,
  frameW: 192,
  scale: 0.33,
  spritesheetBase64: 'data:image/png;base64,test'
}

beforeEach(() => {
  $petInfo.set(info)
  ;(window as unknown as { hermesDesktop: unknown }).hermesDesktop = {
    petOverlay: {
      control,
      onState: (callback: (payload: unknown) => void) => {
        callback({ activity: {}, awaiting: false, busy: false, info, reaction: null, unread: true })

        return () => {}
      },
      setBounds: vi.fn(),
      setFocusable: vi.fn(),
      setIgnoreMouse: vi.fn()
    }
  }
})

afterEach(() => {
  cleanup()
  $petInfo.set({ enabled: false })
  delete (window as unknown as { hermesDesktop?: unknown }).hermesDesktop
  control.mockClear()
})

describe('pet overlay localization', () => {
  it('uses the localized open-app label and Aino product name', () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <PetOverlayApp />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: '打开 Aino' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Open in Hermes' })).toBeNull()
  })
})
