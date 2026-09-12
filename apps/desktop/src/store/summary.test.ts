import { beforeEach, describe, expect, it } from 'vitest'

import { $summaryOpen, closeSummary, openSummary, toggleSummary } from './summary'

describe('summary pane state', () => {
  beforeEach(() => closeSummary())

  it('opens, closes, and toggles without affecting other pane state', () => {
    expect($summaryOpen.get()).toBe(false)

    openSummary()
    expect($summaryOpen.get()).toBe(true)

    toggleSummary()
    expect($summaryOpen.get()).toBe(false)

    toggleSummary()
    expect($summaryOpen.get()).toBe(true)

    closeSummary()
    expect($summaryOpen.get()).toBe(false)
  })
})
