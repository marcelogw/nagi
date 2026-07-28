import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, resolveTheme, systemPrefersDark, watchSystemTheme } from './theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * jsdom ships no `matchMedia`, so every test that touches the OS preference has
 * to supply one. This returns a handle that can flip the preference and fire the
 * change event, which is the only way to exercise the `system` path.
 */
function stubMatchMedia(initiallyPrefersDark: boolean) {
  let prefersDark = initiallyPrefersDark
  const listeners = new Set<() => void>()

  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return prefersDark && query === DARK_QUERY
    },
    addEventListener: (_event: string, listener: () => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_event: string, listener: () => void) => {
      listeners.delete(listener)
    },
  }))

  return {
    flipTo(value: boolean) {
      prefersDark = value
      for (const listener of listeners) listener()
    },
    get listenerCount() {
      return listeners.size
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.classList.remove('dark')
})

describe('resolveTheme', () => {
  // An explicit choice wins over the OS in both directions — the case that
  // breaks when `system` is treated as "whatever the OS says" everywhere.
  it.each([
    ['light', true, 'light'],
    ['light', false, 'light'],
    ['dark', true, 'dark'],
    ['dark', false, 'dark'],
    ['system', true, 'dark'],
    ['system', false, 'light'],
  ] as const)('resolves %s under prefers-dark=%s to %s', (theme, prefersDark, expected) => {
    expect(resolveTheme(theme, prefersDark)).toBe(expected)
  })
})

describe('systemPrefersDark', () => {
  it('reads the dark-scheme query rather than any query it is handed', () => {
    stubMatchMedia(true)

    expect(systemPrefersDark()).toBe(true)
  })
})

describe('applyTheme', () => {
  it('puts the dark class on the document for an explicit dark theme', () => {
    stubMatchMedia(false)

    applyTheme('dark')

    expect(document.documentElement).toHaveClass('dark')
  })

  it('removes the dark class for an explicit light theme, whatever the OS prefers', () => {
    stubMatchMedia(true)
    document.documentElement.classList.add('dark')

    applyTheme('light')

    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('follows the OS preference for the system theme', () => {
    stubMatchMedia(true)

    applyTheme('system')

    expect(document.documentElement).toHaveClass('dark')
  })
})

describe('watchSystemTheme', () => {
  it('reports an OS change and stops reporting once unsubscribed', () => {
    const media = stubMatchMedia(false)
    const onChange = vi.fn()

    const unsubscribe = watchSystemTheme(onChange)
    media.flipTo(true)
    expect(onChange).toHaveBeenCalledTimes(1)

    unsubscribe()
    media.flipTo(false)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(media.listenerCount).toBe(0)
  })
})
