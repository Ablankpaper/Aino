import { useCallback } from 'react'

import { translateNow } from '@/i18n'

import { useTheme } from './context'

// Retired skin names land on the canonical Nous skin so old muscle memory works.
const ALIASES: Record<string, string> = {
  ares: 'ember',
  default: 'nous',
  gold: 'nous',
  hermes: 'nous',
  'nous-light': 'nous'
}

export function useSkinCommand() {
  const { availableThemes, setTheme, themeName } = useTheme()

  return useCallback(
    (rawArg: string) => {
      const arg = rawArg.trim()

      if (!availableThemes.length) {
        return translateNow('desktop.skinCommand.noThemes')
      }

      const activeIndex = Math.max(
        0,
        availableThemes.findIndex(t => t.name === themeName)
      )

      if (!arg || arg === 'next') {
        const next = availableThemes[(activeIndex + 1) % availableThemes.length]
        setTheme(next.name)

        return translateNow('desktop.skinCommand.switched', next.label)
      }

      if (arg === 'list' || arg === 'ls' || arg === 'status') {
        const rows = availableThemes.map(t => `${t.name === themeName ? '*' : ' '} ${t.name.padEnd(10)} ${t.label}`)

        return [
          translateNow('desktop.skinCommand.listHeading'),
          ...rows,
          '',
          translateNow('desktop.skinCommand.listHint')
        ].join('\n')
      }

      const normalized = arg.toLowerCase()
      const targetName = ALIASES[normalized] || normalized

      const target = availableThemes.find(
        t => t.name.toLowerCase() === targetName || t.label.toLowerCase() === normalized
      )

      if (!target) {
        return translateNow('desktop.skinCommand.unknownTheme', arg, availableThemes.map(t => t.name).join(', '))
      }

      setTheme(target.name)

      return translateNow('desktop.skinCommand.switched', target.label)
    },
    [availableThemes, setTheme, themeName]
  )
}
