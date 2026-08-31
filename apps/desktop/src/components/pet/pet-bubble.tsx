import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { type Translations, useI18n } from '@/i18n'
import { AlertCircle, Clock, type IconComponent } from '@/lib/icons'
import { $petActivity, $petState, type PetState } from '@/store/pet'

/**
 * Speech bubble + status glyph for the popped-out pet overlay — the
 * "notification" half of the mascot. It externalizes what the agent is doing
 * (Codex-style) so a glance at the desktop pet replaces switching back to the
 * window. The in-window pet doesn't show it (the app itself is the surface);
 * only the overlay renders it.
 *
 * Text is derived purely from the same `$petState` / `$petActivity` the sprite
 * already reacts to, so it never drifts from the animation. The bubble is shown
 * only when there's something worth saying (working / reviewing / a transient
 * done/error beat / waiting on the user) and is hidden at plain idle.
 */

type Tone = 'error' | 'wait'

interface SpecMeta {
  copyKey: keyof PetBubbleCopy
  glyph?: IconComponent
  tone?: Tone
}

// Visual metadata per mood. The short phrases themselves live in the locale
// catalog so the pop-out mascot does not leak English into a localized UI.
const SPEC_META: Partial<Record<PetState, SpecMeta>> = {
  run: {
    copyKey: 'run'
  },
  review: {
    copyKey: 'review'
  },
  failed: {
    glyph: AlertCircle,
    copyKey: 'failed',
    tone: 'error'
  },
  waiting: {
    glyph: Clock,
    copyKey: 'waiting',
    tone: 'wait'
  }
}

type PetBubbleCopy = Translations['settings']['appearance']['pet']['bubble']

const EMPTY_LINES: readonly string[] = []

const TONE_COLOR: Record<Tone, string> = {
  error: 'var(--ui-red)',
  wait: 'var(--ui-yellow)'
}

// Random pick that avoids repeating the line we're already showing.
function pick(lines: readonly string[], prev: string): string {
  if (lines.length <= 1) {
    return lines[0] ?? ''
  }

  let next = prev

  while (next === prev) {
    next = lines[Math.floor(Math.random() * lines.length)]
  }

  return next
}

export function PetBubble() {
  const { t } = useI18n()
  const state = useStore($petState)
  const activity = useStore($petActivity)
  const [line, setLine] = useState('')
  const bubbleCopy = t.settings.appearance.pet.bubble

  // Finish beats are carried by the sprite/mail icon; idle only speaks up when
  // it's actually the user's turn. Everything else maps to a mood spec.
  const specKey: null | PetState =
    state in SPEC_META ? state : state === 'idle' && activity.awaitingInput ? 'waiting' : null

  const rotating = specKey === 'run' || specKey === 'review'
  const meta = specKey ? SPEC_META[specKey] : null
  const lines = meta ? bubbleCopy[meta.copyKey] : EMPTY_LINES

  // Pick a fresh line on every mood change, then keep rotating (random, no
  // repeat) only while the agent is actively working/thinking.
  useEffect(() => {
    if (!meta) {
      setLine('')

      return
    }

    setLine(prev => pick(lines, prev))

    if (!rotating || lines.length <= 1) {
      return
    }

    const id = window.setInterval(() => setLine(prev => pick(lines, prev)), 2600)

    return () => window.clearInterval(id)
  }, [lines, meta, rotating, specKey])

  if (!meta) {
    return null
  }

  const Glyph = meta.glyph
  const text = line || lines[0]
  const hasText = Boolean(text)

  return (
    <div
      style={{
        alignItems: 'center',
        // Solid, theme-driven surface (the prior --ui-bg-card mixes in
        // `transparent`, so the bubble was see-through).
        background: 'var(--ui-bg-elevated)',
        border: '1px solid var(--ui-stroke-secondary)',
        borderRadius: hasText ? 10 : 999,
        boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
        color: 'var(--foreground)',
        display: 'inline-flex',
        fontSize: 11,
        fontWeight: 500,
        gap: hasText ? 5 : 0,
        lineHeight: 1,
        // Glyph-only bubbles collapse to a tight, symmetric badge.
        padding: hasText ? '5px 8px' : 5,
        pointerEvents: 'none',
        whiteSpace: 'nowrap'
      }}
    >
      {Glyph && (
        <span style={{ display: 'inline-flex' }}>
          <Glyph style={{ color: meta.tone ? TONE_COLOR[meta.tone] : 'currentColor', height: 13, width: 13 }} />
        </span>
      )}
      {text}
    </div>
  )
}
