import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { useOverlayRouting } from './use-overlay-routing'

function Probe() {
  const routing = useOverlayRouting()
  const location = useLocation()

  return (
    <>
      <output data-testid="route">
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => routing.toggleCommandCenter()} type="button">
        toggle
      </button>
      <button onClick={() => routing.openCommandCenterSection('system')} type="button">
        open-system
      </button>
      <button onClick={routing.closeOverlayToPreviousRoute} type="button">
        close
      </button>
    </>
  )
}

afterEach(() => cleanup())

describe('useOverlayRouting', () => {
  it('returns to the active settings tab after opening the command center', () => {
    render(
      <MemoryRouter initialEntries={['/settings?tab=gateway']}>
        <Probe />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'open-system' }))
    expect(screen.getByTestId('route').textContent).toBe('/command-center?section=system')

    fireEvent.click(screen.getByRole('button', { name: 'close' }))
    expect(screen.getByTestId('route').textContent).toBe('/settings?tab=gateway')

    fireEvent.click(screen.getByRole('button', { name: 'close' }))
    expect(screen.getByTestId('route').textContent).toBe('/')
  })

  it('keeps the settings return path for the command-center toggle shortcut', () => {
    render(
      <MemoryRouter initialEntries={['/settings?tab=about']}>
        <Probe />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
    expect(screen.getByTestId('route').textContent).toBe('/command-center')

    fireEvent.click(screen.getByRole('button', { name: 'close' }))
    expect(screen.getByTestId('route').textContent).toBe('/settings?tab=about')
  })
})
