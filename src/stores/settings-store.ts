import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { idbStorage } from '@/lib/idb-storage'

export type Locale = 'en' | 'pt-BR'
export type Theme = 'light' | 'dark'

interface SettingsState {
  locale: Locale
  theme: Theme
  setLocale: (locale: Locale) => void
  setTheme: (theme: Theme) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer((set) => ({
      locale: 'en',
      theme: 'light',
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
      name: 'nagi-settings',
      storage: idbStorage,
    },
  ),
)
