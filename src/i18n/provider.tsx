import type { ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { useSettingsStore } from '@/stores/settings-store'
import en from './messages/en.json'
import ptBR from './messages/pt-BR.json'

// Exported so the test render wrapper feeds components the same catalogue the
// app does. A second copy in test code is a second thing to keep in sync.
export const messages = { en, 'pt-BR': ptBR }

export function AppIntlProvider({ children }: { children: ReactNode }) {
  const locale = useSettingsStore((state) => state.locale)

  return (
    <IntlProvider locale={locale} messages={messages[locale]} timeZone="UTC">
      {children}
    </IntlProvider>
  )
}
