import type { ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { useSettingsStore } from '@/stores/settings-store'
import { APP_TIME_ZONE, messages } from './messages'

export function AppIntlProvider({ children }: { children: ReactNode }) {
  const locale = useSettingsStore((state) => state.locale)

  return (
    <IntlProvider locale={locale} messages={messages[locale]} timeZone={APP_TIME_ZONE}>
      {children}
    </IntlProvider>
  )
}
