/**
 * Cache backend skin data for legacy assets and plugin previews.
 * CLI/TUI continue to own their skin choice. Aino's ThemeProvider drains
 * compatibility apply requests without changing its fixed desktop palette
 * or rewriting the user's legacy assignments.
 */

import type { HermesSkin } from '@hermes/shared/skin'
import { atom } from 'nanostores'

import { readJson, writeJson } from '@/lib/storage'

import { BUILTIN_THEMES } from './presets'
import { skinToDesktopTheme } from './skin'
import { type DesktopTheme, isValidTheme } from './types'

// Preserve known backend assets across launches for legacy/plugin consumers.
const BACKEND_THEMES_KEY = 'hermes-desktop-backend-themes-v1'

const readCached = (): Record<string, DesktopTheme> =>
  Object.fromEntries(
    Object.entries(readJson<Record<string, unknown>>(BACKEND_THEMES_KEY) ?? {}).filter(
      (entry): entry is [string, DesktopTheme] => !BUILTIN_THEMES[entry[0]] && isValidTheme(entry[1])
    )
  )

/** Skins pushed by the backend, keyed by name. Merged by `listAllThemes`. */
export const $backendThemes = atom<Record<string, DesktopTheme>>(typeof window === 'undefined' ? {} : readCached())

$backendThemes.listen(themes => writeJson(BACKEND_THEMES_KEY, themes))

/** One-shot skin name the ThemeProvider should switch to (it clears this). */
export const $pendingSkinApply = atom<string | null>(null)

// Last skin name synced from the backend + whether it was ever APPLIED (vs
// merely seeded at connect). Once applied, only a name change applies again —
// no re-apply on repeat events, no snap-back after a manual desktop switch.
// A `skin.changed` matching a seed-only baseline still applies: the seed
// records without painting, so if the activation event was missed (backend
// restart / disconnected), an explicit re-affirm must repaint, not no-op.
let lastSynced: { applied: boolean; name: string } | null = null

/** Test-only: reset the module's apply guard + registry between cases. */
export function __resetBackendSkinSync(): void {
  lastSynced = null
  $backendThemes.set({})
  $pendingSkinApply.set(null)
}

/**
 * Fold a resolved skin into the desktop. `apply: false` (connect-time seed) only
 * records the baseline; `apply: true` queues a compatibility request on a name
 * change. Aino's ThemeProvider never applies an alternate palette.
 */
export function ingestBackendSkin(skin: HermesSkin | undefined | null, { apply }: { apply: boolean }): void {
  const name = (skin && typeof skin === 'object' ? (skin.name ?? '') : '').trim()

  if (!name) {
    return
  }

  // Built-ins keep their authored definitions; backend conversions never
  // shadow them. `default` does not declare a palette of its own.
  if (name !== 'default' && !BUILTIN_THEMES[name]) {
    const theme = skinToDesktopTheme(skin as HermesSkin)

    if (!theme) {
      return
    }

    const current = $backendThemes.get()

    if (JSON.stringify(current[name]) !== JSON.stringify(theme)) {
      $backendThemes.set({ ...current, [name]: theme })
    }
  }

  if (!apply) {
    // Connect-time seed: record without painting. A reconnect re-seed keeps an
    // earlier real apply's flag so repeat events can't override a manual switch.
    if (lastSynced?.name !== name || !lastSynced.applied) {
      lastSynced = { applied: false, name }
    }

    return
  }

  if (name !== lastSynced?.name || !lastSynced.applied) {
    lastSynced = { applied: true, name }
    $pendingSkinApply.set(name)
  }
}
