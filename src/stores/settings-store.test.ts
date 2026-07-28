import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from './settings-store'

// The reference example for a store test: drive the real store through its own
// actions and assert the resulting state. No mocked internals, and never an
// assertion about which calls were made.

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'en', theme: 'light' })
  })

  it('starts on the source locale and the light theme', () => {
    expect(useSettingsStore.getState().locale).toBe('en')
    expect(useSettingsStore.getState().theme).toBe('light')
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
