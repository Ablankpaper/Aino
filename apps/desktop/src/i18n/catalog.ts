import { brandTranslationTree } from '@/lib/brand'

import { ar } from './ar'
import { en } from './en'
import { ja } from './ja'
import type { Locale, Translations } from './types'
import { zh } from './zh'
import { zhHant } from './zh-hant'

// Keep locale source files upstream-shaped and apply Aino's product overlay at
// the catalog boundary. This makes future upstream locale syncs low-conflict
// while every renderer surface receives the same visible identity.
export const TRANSLATIONS: Record<Locale, Translations> = brandTranslationTree({
  en,
  zh,
  'zh-hant': zhHant,
  ja,
  ar
})
