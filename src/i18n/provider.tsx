import type { ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { useSettingsStore } from '@/stores/settings-store'
import en from './messages/en.json'
import ptBR from './messages/pt-BR.json'

const messages = { en, 'pt-BR': ptBR }

export function AppIntlProvider({ children }: { children: ReactNode }) {
  const locale = useSettingsStore((state) => state.locale)

  return (
    <IntlProvider locale={locale} messages={messages[locale]} timeZone="UTC">
      {children}
    </IntlProvider>
  )
}
