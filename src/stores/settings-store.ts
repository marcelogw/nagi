import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { detectLocale, type Locale } from '@/i18n/locales'
import type { Theme } from '@/lib/theme'

/**
 * The key the persisted settings live under.
 *
 * The blocking theme script in `index.html` reads this same key before React
 * boots, and cannot import it — a module would not be blocking. The literal is
 * therefore written twice, and `settings-store.test.ts` fails if the two ever
 * disagree.
 */
export const SETTINGS_STORAGE_KEY = 'nagi-settings'

interface SettingsState {
  locale: Locale
  /**
   * An ISO 4217 code, and a setting of its own — never derived from the locale.
   * Someone reading the app in English still gets paid in reais.
   */
  currency: string
  theme: Theme
  setLocale: (locale: Locale) => void
  setCurrency: (currency: string) => void
  setTheme: (theme: Theme) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer<SettingsState>((set) => ({
      // Detection is the initial value rather than a step of its own: persist
      // only overwrites what it finds in storage, so a returning user keeps the
      // language they chose and a first-time visitor gets the one their browser
      // asked for. No rehydration callback needed for either.
      locale: detectLocale(navigator.languages),
      currency: 'BRL',
      theme: 'system',
      setLocale: (locale) =>
        set((state) => {
          state.locale = locale
        }),
      setCurrency: (currency) =>
        set((state) => {
          state.currency = currency
        }),
      setTheme: (theme) =>
        set((state) => {
          state.theme = theme
        }),
    })),
    {
      name: SETTINGS_STORAGE_KEY,
      // localStorage, not IndexedDB, and the theme is the reason: IndexedDB is
      // async, so a blocking script cannot read it, so the first paint would
      // land in the wrong theme and correct itself visibly. Settings are a
      // handful of scalars — the store that has to be readable before the first
      // frame is the one that goes in synchronous storage. IndexedDB stays
      // where it belongs, holding the domain data that arrives after paint.
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
