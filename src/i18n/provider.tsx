import type { ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { useSettingsStore } from '@/stores/settings-store'
import { APP_TIME_ZONE, messagesFor } from './locales'

export function AppIntlProvider({ children }: { children: ReactNode }) {
  // The store is the single source of truth for the locale, so a switch is an
  // ordinary state update: React re-renders the tree in place, and nothing
  // reloads the page or re-reads the locale from anywhere else.
  const locale = useSettingsStore((state) => state.locale)

  return (
    <IntlProvider locale={locale} messages={messagesFor(locale)} timeZone={APP_TIME_ZONE}>
      {children}
    </IntlProvider>
  )
}
