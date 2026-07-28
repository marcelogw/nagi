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

afterEach(() => {
  cleanup()
})
