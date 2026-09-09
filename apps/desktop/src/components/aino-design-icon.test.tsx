import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AinoDesignIcon } from './aino-design-icon'

describe('AinoDesignIcon', () => {
  afterEach(cleanup)

  it('keeps Vite-inlined SVG data URLs as a valid CSS mask', () => {
    const src =
      "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%201%201'%3e%3crect%20width='1'%20height='1'/%3e%3c/svg%3e"

    const { container } = render(<AinoDesignIcon src={src} />)
    const icon = container.querySelector<HTMLElement>('[data-aino-design-icon]')

    expect(icon?.style.maskImage).toBe(`url("${src}")`)
    expect(icon?.style.webkitMaskImage).toBe(`url("${src}")`)
  })
})
