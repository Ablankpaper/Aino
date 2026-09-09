/**
 * Plugin-scoped copy for the developer accent picker. The picker is opt-in,
 * but it still follows the app locale so every surface remains readable when
 * the tool is enabled while authoring a theme.
 */

import { type PluginLocaleBundles, type PluginTranslate, usePluginI18n } from '@hermes/plugin-sdk'
import { useMemo } from 'react'

type AccentMessages = {
  triggerTitle: string
  reset: string
  resetCommand: string
  copyCommand: string
  hexInputLabel: string
  contrastLabel: string
  pickedForContrast: (override: string, painted: string) => string
  modeLabel: (mode: string) => string
  swatchTitle: (id: string, hex: string) => string
}

const SWATCH_NAMES = {
  en: {
    githubGreen: 'GitHub green · 148°',
    githubOrange: 'GitHub orange · 52°',
    githubPink: 'GitHub pink · 354°',
    githubPurple: 'GitHub purple · 303°',
    githubBlue: 'GitHub blue · 257°',
    nousBlueDark: 'Nous blue · 263° (dark seed)',
    nousBlueLight: 'Nous blue · 263° (light seed)',
    psycheBlue: 'Psyche blue · 264°'
  },
  ja: {
    githubGreen: 'GitHub グリーン・148°',
    githubOrange: 'GitHub オレンジ・52°',
    githubPink: 'GitHub ピンク・354°',
    githubPurple: 'GitHub パープル・303°',
    githubBlue: 'GitHub ブルー・257°',
    nousBlueDark: 'Nous ブルー・263°（ダーク用）',
    nousBlueLight: 'Nous ブルー・263°（ライト用）',
    psycheBlue: 'Psyche ブルー・264°'
  },
  zh: {
    githubGreen: 'GitHub 绿 · 148°',
    githubOrange: 'GitHub 橙 · 52°',
    githubPink: 'GitHub 粉 · 354°',
    githubPurple: 'GitHub 紫 · 303°',
    githubBlue: 'GitHub 蓝 · 257°',
    nousBlueDark: 'Nous 蓝 · 263°（深色种子）',
    nousBlueLight: 'Nous 蓝 · 263°（浅色种子）',
    psycheBlue: 'Psyche 蓝 · 264°'
  },
  'zh-hant': {
    githubGreen: 'GitHub 綠・148°',
    githubOrange: 'GitHub 橙・52°',
    githubPink: 'GitHub 粉・354°',
    githubPurple: 'GitHub 紫・303°',
    githubBlue: 'GitHub 藍・257°',
    nousBlueDark: 'Nous 藍・263°（深色種子）',
    nousBlueLight: 'Nous 藍・263°（淺色種子）',
    psycheBlue: 'Psyche 藍・264°'
  }
} as const

const MODE_LABELS = {
  en: { dark: 'Dark', light: 'Light' },
  ja: { dark: 'ダーク', light: 'ライト' },
  zh: { dark: '深色', light: '浅色' },
  'zh-hant': { dark: '深色', light: '淺色' }
} as const

const lookup = (value: string, labels: Readonly<Record<string, string>>): string => labels[value] ?? value

const makeSwatchTitle = (labels: Readonly<Record<string, string>>, id: string, hex: string): string =>
  `${lookup(id, labels)} · ${hex}`

export const en: AccentMessages = {
  triggerTitle: 'Accent color (dev)',
  reset: 'Reset',
  resetCommand: 'Accent: reset to the theme default',
  copyCommand: 'Accent: copy the current color',
  hexInputLabel: 'Accent color hex value',
  contrastLabel: 'Contrast ratio',
  pickedForContrast: (override, painted) => `picked ${override} → ${painted} for contrast`,
  modeLabel: mode => lookup(mode, MODE_LABELS.en),
  swatchTitle: (id, hex) => makeSwatchTitle(SWATCH_NAMES.en, id, hex)
}

const ja: AccentMessages = {
  triggerTitle: 'アクセントカラー（開発用）',
  reset: 'リセット',
  resetCommand: 'アクセント: テーマの既定値にリセット',
  copyCommand: 'アクセント: 現在の色をコピー',
  hexInputLabel: 'アクセントカラーの HEX 値',
  contrastLabel: 'コントラスト比',
  pickedForContrast: (override, painted) => `コントラスト調整: ${override} → ${painted}`,
  modeLabel: mode => lookup(mode, MODE_LABELS.ja),
  swatchTitle: (id, hex) => makeSwatchTitle(SWATCH_NAMES.ja, id, hex)
}

const zh: AccentMessages = {
  triggerTitle: '强调色（开发）',
  reset: '重置',
  resetCommand: '强调色：重置为主题默认值',
  copyCommand: '强调色：复制当前颜色',
  hexInputLabel: '强调色十六进制值',
  contrastLabel: '对比度',
  pickedForContrast: (override, painted) => `已选 ${override} → ${painted}（已按对比度调整）`,
  modeLabel: mode => lookup(mode, MODE_LABELS.zh),
  swatchTitle: (id, hex) => makeSwatchTitle(SWATCH_NAMES.zh, id, hex)
}

const zhHant: AccentMessages = {
  triggerTitle: '強調色（開發用）',
  reset: '重設',
  resetCommand: '強調色：重設為主題預設值',
  copyCommand: '強調色：複製目前顏色',
  hexInputLabel: '強調色十六進位值',
  contrastLabel: '對比度',
  pickedForContrast: (override, painted) => `已選 ${override} → ${painted}（已依對比度調整）`,
  modeLabel: mode => lookup(mode, MODE_LABELS['zh-hant']),
  swatchTitle: (id, hex) => makeSwatchTitle(SWATCH_NAMES['zh-hant'], id, hex)
}

export const ACCENT_LOCALES: PluginLocaleBundles = { en, ja, zh, 'zh-hant': zhHant }

type Bound<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : T[K] extends object
      ? Bound<T[K]>
      : string
}

function bind<T extends object>(t: PluginTranslate, template: T, prefix = ''): Bound<T> {
  const out = {} as Record<string, unknown>

  for (const [key, value] of Object.entries(template)) {
    const path = prefix ? `${prefix}.${key}` : key
    out[key] =
      typeof value === 'function'
        ? (...args: unknown[]) => {
            const translated = t(path, ...args)

            return translated === path ? (value as (...a: unknown[]) => string)(...args) : translated
          }
        : value && typeof value === 'object'
          ? bind(t, value as object, path)
          : (() => {
              const translated = t(path)

              return translated === path ? value : translated
            })()
  }

  return out as Bound<T>
}

export type AccentText = Bound<AccentMessages>

export function useAccent(): AccentText {
  const t = usePluginI18n('accent')

  return useMemo(() => bind(t, en), [t])
}
