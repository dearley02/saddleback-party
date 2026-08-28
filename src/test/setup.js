import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// The app relies on three browser APIs that jsdom does not implement.
// Without these, rendering <App /> throws before any assertion runs.
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }
  // FadeIn only reveals its children once an entry intersects, so report
  // everything as visible immediately — otherwise the page renders empty.
  observe() {
    this.callback([{ isIntersecting: true }])
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  vi.stubGlobal('scrollTo', vi.fn())
  vi.stubGlobal('gtag', vi.fn())
  vi.stubGlobal('gtag_report_conversion', vi.fn())
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
})

// Without an explicit cleanup, each render stacks another <App /> into the
// same document and queries start matching the previous test's markup.
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
