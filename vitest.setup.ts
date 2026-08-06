import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// The Vite config sets TZ on the parent process and the workers are expected to
// inherit it, but that is a property of the pool and the platform rather than a
// guarantee. Assert it instead of trusting it: if the timezone ever fails to
// reach a worker, this fails loudly here rather than quietly turning every date
// assertion in the suite back into a UTC one.
const EXPECTED_TIME_ZONE = 'America/Sao_Paulo'
const actual = Intl.DateTimeFormat().resolvedOptions().timeZone
if (actual !== EXPECTED_TIME_ZONE) {
  throw new Error(
    `Tests must run under ${EXPECTED_TIME_ZONE}, got ${actual}. ` +
      `Under UTC the date-parsing defects this suite exists to catch are invisible. ` +
      `Set TZ=${EXPECTED_TIME_ZONE} before invoking vitest.`,
  )
}

// jsdom implements no `matchMedia`, and anything that renders the shell reads
// the OS colour-scheme preference through it. Default to "prefers light" so a
// component test does not have to care; a test that is *about* the preference
// stubs its own (see `src/lib/theme.test.ts`).
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList

// jsdom implements no pointer-capture or scroll machinery, and Radix Select
// (the first Radix primitive in this repo) calls all of these while opening,
// positioning and closing — without the stubs, every interaction test throws
// on the first click rather than exercising the component.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  cleanup()
})
