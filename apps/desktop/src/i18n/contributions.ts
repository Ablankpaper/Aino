import type { ContributionSource } from '@/contrib/types'

import type { Translations } from './types'

type CoreSource = ContributionSource | undefined

const isCoreContribution = (source: CoreSource): boolean => source === undefined || source === 'core'

const PANE_TITLE_KEYS = {
  files: 'files',
  logs: 'logs',
  review: 'review',
  sessions: 'sessions',
  terminal: 'terminal'
} as const

const LAYOUT_TITLE_KEYS = {
  default: 'default',
  focus: 'focus',
  quad: 'quad',
  'terminal-deck': 'terminalDeck'
} as const

const PALETTE_LABELS: Record<string, (t: Translations) => string> = {
  'keybinds.panel': t => t.commandCenter.contributedActions.keyboardShortcuts,
  'layout.editMode': t => t.commandCenter.contributedActions.layoutEditMode,
  'layout.reset': t => t.commandCenter.contributedActions.resetLayout,
  'logs.toggle': t => t.commandCenter.contributedActions.toggleLogs,
  'plugins.reload': t => t.commandCenter.contributedActions.reloadPlugins,
  'profile.export': t => t.commandCenter.contributedActions.exportProfile,
  'profile.import': t => t.commandCenter.contributedActions.importProfile,
  'session.yolo': t => t.commandCenter.contributedActions.toggleYolo,
  'view.showTerminal': t => t.commandCenter.contributedActions.toggleTerminal,
  'view.toggleStatusbar': t => t.commandCenter.contributedActions.toggleStatusbar,
  'view.toggleTabStrip': t => t.commandCenter.contributedActions.toggleTabs,
  'strip-tab.files': t => t.zones.toggleStripTab(t.zones.paneTitles.files),
  'strip-tab.logs': t => t.zones.toggleStripTab(t.zones.paneTitles.logs),
  'strip-tab.review': t => t.zones.toggleStripTab(t.zones.paneTitles.review),
  'strip-tab.sessions': t => t.zones.toggleStripTab(t.zones.paneTitles.sessions),
  'strip-tab.terminal': t => t.zones.toggleStripTab(t.zones.paneTitles.terminal)
}

/**
 * Resolve a pane's visible title without translating plugin or user-provided
 * names. Core pane ids are stable protocol values; their registered English
 * titles are only fallbacks for non-core locales or older callers.
 */
export function localizedPaneTitle(
  translations: Translations,
  paneId: string,
  fallback: string,
  source: CoreSource
): string {
  if (!isCoreContribution(source)) {
    return fallback
  }

  const key = PANE_TITLE_KEYS[paneId as keyof typeof PANE_TITLE_KEYS]

  return key ? translations.zones.paneTitles[key] : fallback
}

/** Resolve the display name of a bundled layout preset while preserving names
 * authored by users and plugins. */
export function localizedLayoutTitle(
  translations: Translations,
  presetId: string,
  fallback: string,
  source: CoreSource
): string {
  if (!isCoreContribution(source)) {
    return fallback
  }

  const key = LAYOUT_TITLE_KEYS[presetId as keyof typeof LAYOUT_TITLE_KEYS]

  return key ? translations.zones.layoutTitles[key] : fallback
}

/** Resolve a core command-palette contribution against the current locale.
 * Unknown/plugin contributions intentionally keep their registered label. */
export function localizedPaletteLabel(
  translations: Translations,
  contributionId: string,
  fallback: string,
  source: CoreSource
): string {
  if (!isCoreContribution(source)) {
    return fallback
  }

  return PALETTE_LABELS[contributionId]?.(translations) ?? fallback
}
