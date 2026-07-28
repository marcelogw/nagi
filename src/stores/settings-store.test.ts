import { beforeEach, describe, expect, it } from 'vitest'
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
})

describe('the blocking theme script', () => {
  // The script in index.html has to be inline and blocking, so it cannot import
  // the key or the class name — it repeats both literals. These two assertions
  // are what stops a rename here from silently reintroducing the flash of the
  // wrong theme, which nothing else in the suite would catch.
  it('reads the same storage key the store writes', () => {
    expect(indexHtml).toContain(`'${SETTINGS_STORAGE_KEY}'`)
  })

  it('toggles the same class the token files scope dark values to', () => {
    expect(indexHtml).toContain("classList.toggle('dark'")
  })
})
