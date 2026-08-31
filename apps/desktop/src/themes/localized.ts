import { TRANSLATIONS, type Translations } from '@/i18n'
import { getRuntimeI18nLocale } from '@/i18n/runtime'

import type { DesktopTheme } from './types'

export interface LocalizedThemeCopy {
  label: string
  description: string
}

/** Resolve a theme's display copy from the active React locale. */
export function localizedThemeCopy(
  theme: Pick<DesktopTheme, 'name' | 'label' | 'description'>,
  t: Translations
): LocalizedThemeCopy {
  return (
    t.settings.appearance.themePresets[theme.name] ?? {
      label: theme.label,
      description: theme.description
    }
  )
}

/** Resolve a theme's display copy for non-React paths such as `/skin`. */
export function localizedThemeCopyNow(theme: Pick<DesktopTheme, 'name' | 'label' | 'description'>): LocalizedThemeCopy {
  return localizedThemeCopy(theme, TRANSLATIONS[getRuntimeI18nLocale()])
}
