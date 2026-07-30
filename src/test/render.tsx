import type { ReactElement, ReactNode } from 'react'
import { expect, vi } from 'vitest'
import { render as rtlRender, waitFor, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { IntlProvider } from 'use-intl'
import { APP_TIME_ZONE, messagesFor, type Locale } from '@/i18n/locales'
import { routerOptions } from '@/router'

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
 */
export function render(ui: ReactElement, { locale = 'en', ...options }: Options = {}) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <IntlProvider locale={locale} messages={messagesFor(locale)} timeZone={APP_TIME_ZONE}>
        {children}
      </IntlProvider>
    )
  }

  return {
    // `advanceTimers` is not optional. user-event waits on real timers by
    // default, so under `vi.useFakeTimers()` — which anything reading the clock
    // is required to use — every interaction would hang until the test timed
    // out.
    //
    // It has to be guarded, though: handing `vi.advanceTimersByTime` over
    // directly throws on the first interaction of any test using real timers,
    // which is most of them.
    user: userEvent.setup({
      advanceTimers: (ms) => {
        if (vi.isFakeTimers()) vi.advanceTimersByTime(ms)
      },
    }),
    ...rtlRender(ui, { wrapper: Wrapper, ...options }),
  }
}

/**
 * Render the real app at a URL, and hand back the router that got it there.
 *
 * A memory history gives each test its own browser-shaped history without a
 * browser. The route tree is the app's own, not a fixture — a test tree would
 * pass while the real one redirected somewhere else.
 */
export async function renderRoute(path: string, options: Options = {}) {
  const router = createRouter({
    ...routerOptions,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  const result = render(<RouterProvider router={router} />, options)
  await waitFor(() => {
    expect(router.state.status).toBe('idle')
  })

  return { ...result, router }
}

export { screen, waitFor, within } from '@testing-library/react'
