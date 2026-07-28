import { beforeEach, describe, expect, it } from 'vitest'
// Vite's `?raw` rather than `node:fs`: the app's tsconfig deliberately omits the
// node types, and adding them to read one file here would hand every module in
// `src/` a filesystem it has no business touching.
import indexHtml from '../../index.html?raw'
import { SETTINGS_STORAGE_KEY, useSettingsStore } from './settings-store'

// The reference example for a store test: drive the real store through its own
// actions and assert the resulting state. No mocked internals, and never an
// assertion about which calls were made.

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'en', theme: 'system' })
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
