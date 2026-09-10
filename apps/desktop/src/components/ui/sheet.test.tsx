import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Sheet, SheetContent, SheetTitle } from './sheet'

afterEach(cleanup)

describe('SheetContent close button', () => {
  it('uses the shared Aino button chrome and still closes through Radix', () => {
    const onOpenChange = vi.fn()

    render(
      <Sheet onOpenChange={onOpenChange} open>
        <SheetContent>
          <SheetTitle>Details</SheetTitle>
        </SheetContent>
      </Sheet>
    )

    const close = screen.getByRole('button', { name: /close|关闭/i })

    expect(close.getAttribute('data-slot')).toBe('button')
    expect(close.className).toContain('size-8')
    expect(close.className).toContain('rounded-[4px]')

    fireEvent.click(close)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
