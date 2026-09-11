// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  Object.defineProperty(window, 'hermesDesktop', {
    configurable: true,
    value: { glassSupported: true }
  })
})

import { setTranslucency, setTranslucencyMode, setTranslucencyScope } from './translucency'

const root = document.documentElement
const edge = () => root.style.getPropertyValue('--glass-rail-edge')

afterEach(() => {
  setTranslucencyMode('clear')
  document.body.replaceChildren()
  root.style.removeProperty('direction')
})

describe('glass follows the foreground navigation', () => {
  it.each(['ltr', 'rtl'])('tracks mounting, Settings, collapse and return in %s', async direction => {
    root.style.direction = direction
    setTranslucencyMode('glass')
    setTranslucency(50)
    setTranslucencyScope('sidebar')

    const rail = (width: number) => {
      const element = document.createElement('aside')
      const left = direction === 'rtl' ? window.innerWidth - width : 0
      element.getBoundingClientRect = () => new DOMRect(left, 0, width, 600)

      return element
    }

    const chat = rail(260)
    chat.dataset.slot = 'sidebar'
    document.body.append(chat)
    await vi.waitFor(() => expect(edge()).toBe(`${chat.getBoundingClientRect().width}px`))

    const settings = document.createElement('section')
    settings.dataset.settingsWorkspace = ''
    const navigation = rail(208)
    navigation.dataset.ainoOverlayNav = ''
    settings.append(navigation)
    document.body.append(settings)
    await vi.waitFor(() => expect(edge()).toBe(`${navigation.getBoundingClientRect().width}px`))

    // The wide navigation becomes display:none when Settings uses its dropdown.
    const expandedRect = navigation.getBoundingClientRect
    navigation.getBoundingClientRect = () => new DOMRect()
    window.dispatchEvent(new Event('resize'))
    expect(edge()).toBe('0px')
    navigation.getBoundingClientRect = expandedRect
    window.dispatchEvent(new Event('resize'))
    expect(edge()).toBe(`${navigation.getBoundingClientRect().width}px`)

    settings.remove()
    await vi.waitFor(() => expect(edge()).toBe(`${chat.getBoundingClientRect().width}px`))
    chat.remove()
    await vi.waitFor(() => expect(edge()).toBe('0px'))

    setTranslucencyMode('clear')
    document.body.append(chat)
    await Promise.resolve()
    expect(edge()).toBe('')
  })
})
