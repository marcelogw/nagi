import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Theme } from '@/lib/theme'

export type Locale = 'en' | 'pt-BR'

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
  theme: Theme
  setLocale: (locale: Locale) => void
  setTheme: (theme: Theme) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer<SettingsState>((set) => ({
      locale: 'en',
      theme: 'system',
      setLocale: (locale) =>
        set((state) => {
          state.locale = locale
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
