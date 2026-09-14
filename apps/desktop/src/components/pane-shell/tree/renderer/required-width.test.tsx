import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

import { layoutRequiredWidth } from './required-width'

afterEach(cleanup)

it('reserves nested chat and preview floors in addition to the user-sized navigation track', () => {
  const { container } = render(
    <div data-tree-split="root" style={{ display: 'flex', flexDirection: 'row' }}>
      <div style={{ flexBasis: '280px', minWidth: '240px' }} />
      <div style={{ flexBasis: '0px', minWidth: '0px' }}>
        <div data-tree-split="content" style={{ display: 'flex', flexDirection: 'row' }}>
          <div style={{ minWidth: '320px' }} />
          <div style={{ minWidth: '350px' }} />
        </div>
      </div>
      <div style={{ display: 'none', flexBasis: '250px' }} />
    </div>
  )

  expect(layoutRequiredWidth(container)).toBe(950)
})

it('uses the widest vertical track without treating terminal height as reserved width', () => {
  const { container } = render(
    <div data-tree-split="root" style={{ display: 'flex', flexDirection: 'column' }}>
      <div>
        <div data-tree-split="content" style={{ display: 'flex', flexDirection: 'row' }}>
          <div style={{ flexBasis: '28px' }} />
          <div style={{ minWidth: '320px' }} />
        </div>
      </div>
      <div style={{ flexBasis: '400px', minWidth: '160px' }} />
    </div>
  )

  expect(layoutRequiredWidth(container)).toBe(348)
})
