import type { ReactElement, ReactNode } from 'react'
import { render as rtlRender, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { messages } from '@/i18n/provider'
import type { Locale } from '@/stores/settings-store'

type Options = Omit<RenderOptions, 'wrapper'> & {
  /** Defaults to the source locale. Pass another to check a translated path. */
  locale?: Locale
}

/**
 * Render a component the way the app renders it.
 *
 * Every component test goes through this instead of Testing Library's `render`
 * directly: a component that reads a translation throws without a surrounding
 * provider, and wiring one per test file is how test setups drift apart.
 *
 * Returns a bound `user` alongside the usual result, so interaction tests do
 * not each call `userEvent.setup()`.
 *
 * ponytail: no router here yet — nothing rendered so far needs one. Add it as
 * an option when the first route-aware component gets a test, not before.
 */
export function render(ui: ReactElement, { locale = 'en', ...options }: Options = {}) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <IntlProvider locale={locale} messages={messages[locale]} timeZone="UTC">
        {children}
      </IntlProvider>
    )
  }

  return {
    user: userEvent.setup(),
    ...rtlRender(ui, { wrapper: Wrapper, ...options }),
  }
}

export { screen, waitFor, within } from '@testing-library/react'
