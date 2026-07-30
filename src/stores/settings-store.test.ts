import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// Vite's `?raw` rather than `node:fs`: the app's tsconfig deliberately omits the
// node types, and adding them to read one file here would hand every module in
// `src/` a filesystem it has no business touching.
import indexHtml from '../../index.html?raw'
import { detectLocale } from '@/i18n/locales'
import { SETTINGS_STORAGE_KEY, useSettingsStore } from './settings-store'

// The reference example for a store test: drive the real store through its own
// actions and assert the resulting state. No mocked internals, and never an
// assertion about which calls were made.

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'en', currency: 'BRL', theme: 'system' })
  })

  it('starts on the source locale and follows the OS theme', () => {
    expect(useSettingsStore.getState().locale).toBe('en')
    expect(useSettingsStore.getState().theme).toBe('system')
  })

  it('switches the locale', () => {
    useSettingsStore.getState().setLocale('pt-BR')

    expect(useSettingsStore.getState().locale).toBe('pt-BR')
  })

  it('switches the theme without touching the locale', () => {
    useSettingsStore.getState().setLocale('pt-BR')
    useSettingsStore.getState().setTheme('dark')

    expect(useSettingsStore.getState().theme).toBe('dark')
    expect(useSettingsStore.getState().locale).toBe('pt-BR')
  })

  // Currency is not a property of the language, and the store is where that
  // stops being an opinion: changing one has to leave the other alone.
  it('switches the currency without touching the locale', () => {
    useSettingsStore.getState().setCurrency('USD')

    expect(useSettingsStore.getState().currency).toBe('USD')
    expect(useSettingsStore.getState().locale).toBe('en')
  })

  it('switches the locale without touching the currency', () => {
    useSettingsStore.getState().setLocale('pt-BR')

    expect(useSettingsStore.getState().currency).toBe('BRL')
  })
})

describe('the initial locale', () => {
  // The store defaults to what the browser asked for, and persist overwrites it
  // only when something was actually stored. jsdom reports en-US, so this
  // asserts the wiring rather than the matching — `locales.test.ts` covers the
  // branches.
  it('comes from the browser rather than a hardcoded default', () => {
    expect(navigator.languages.length).toBeGreaterThan(0)
    expect(useSettingsStore.getInitialState().locale).toBe(detectLocale(navigator.languages))
  })

  it('starts on reais regardless of the language', () => {
    expect(useSettingsStore.getInitialState().currency).toBe('BRL')
  })

  // Asserted on the initial state, not on state the test set up itself: the
  // default is the entry point of the whole theme feature, and a `beforeEach`
  // that writes 'system' first would keep passing if the default changed.
  it('follows the OS until the user says otherwise', () => {
    expect(useSettingsStore.getInitialState().theme).toBe('system')
  })
})

describe('the blocking theme script', () => {
  /**
   * Run the real script out of the real `index.html`, against this test's own
   * DOM.
   *
   * The script cannot be imported — it has to be inline to block — so the only
   * honest way to cover it is to lift it out of the file and execute it.
   * Asserting that the file merely *contains* the right strings is what let an
   * earlier version of this suite pass with the script reading the wrong
   * property, which is a light frame on every dark reload with a green build.
   */
  function runBlockingScript({ stored, prefersDark }: { stored?: string; prefersDark: boolean }) {
    const [, source] = /<script>([\s\S]*?)<\/script>/.exec(indexHtml) ?? []
    if (!source) throw new Error('index.html no longer carries an inline script')

    localStorage.clear()
    if (stored !== undefined) localStorage.setItem(SETTINGS_STORAGE_KEY, stored)
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: prefersDark && query === '(prefers-color-scheme: dark)',
    }))
    document.documentElement.classList.remove('dark')

    new Function(source)()

    return document.documentElement.classList.contains('dark')
  }

  const persisted = (theme: string) => JSON.stringify({ state: { theme }, version: 0 })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it.each([
    ['an explicit dark preference', persisted('dark'), false, true],
    ['an explicit light preference, against a dark OS', persisted('light'), true, false],
    ['the system preference on a dark OS', persisted('system'), true, true],
    ['the system preference on a light OS', persisted('system'), false, false],
    ['nothing stored yet, on a dark OS', undefined, true, true],
    ['nothing stored yet, on a light OS', undefined, false, false],
  ])('resolves %s', (_case, stored, prefersDark, expected) => {
    expect(runBlockingScript({ stored, prefersDark })).toBe(expected)
  })

  // Storage can be unreadable (private mode, a spent quota) or hold something
  // hand-edited. Throwing here would take the whole page down before React
  // ever loads, so the script has to survive it.
  it.each(['not json at all', '{}', '{"state":null}', '{"state":{"theme":"chartreuse"}}'])(
    'falls back to light rather than throwing on %s',
    (stored) => {
      expect(runBlockingScript({ stored, prefersDark: false })).toBe(false)
    },
  )

  it('reads the same storage key the store writes', () => {
    expect(indexHtml).toContain(`'${SETTINGS_STORAGE_KEY}'`)
  })
})
