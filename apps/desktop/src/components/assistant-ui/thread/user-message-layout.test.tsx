import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { HumanMessageContainer } from './user-message'

afterEach(() => {
  cleanup()
})

describe('user message transcript layout', () => {
  it('keeps the user message root in the normal transcript flow', () => {
    const { container } = render(
      <HumanMessageContainer messageId="user-1">
        <span>hello</span>
      </HumanMessageContainer>
    )

    const root = container.querySelector('[data-slot="aui_user-message-root"]')

    expect(root).toBeTruthy()
    // A sticky root parks the prompt while the assistant turn scrolls, which
    // makes the two sides drift apart. User bubbles must move with the same
    // transcript flow as the assistant content.
    expect(root?.classList.contains('sticky')).toBe(false)
  })
})
