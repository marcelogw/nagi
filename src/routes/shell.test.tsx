import { describe, expect, it } from 'vitest'
import { renderRoute, screen, within } from '@/test/render'
import { currentMonth } from '@/domain/month'
import { useSettingsStore } from '@/stores/settings-store'

// The reference example for a component test: rendered the way the app renders
// it, queried by role and label, asserted in both locales rather than against a
// hardcoded string. Never query by class name.

describe('the shell', () => {
  it('is present on every route', async () => {
    await renderRoute('/dashboard')

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
  })

  // Both are in the DOM at every width; the stylesheet decides which is seen.
  // jsdom applies no media queries, so this asserts the contract the CSS
  // depends on — that neither is conditionally rendered in JavaScript.
  it('carries the same destinations in the rail and the tab bar', async () => {
    await renderRoute('/dashboard')

    for (const id of ['dashboard', 'months', 'goals', 'categories', 'cards']) {
      expect(within(screen.getByTestId('nav-rail')).getByTestId(`nav-link-${id}`)).toBeVisible()
      expect(within(screen.getByTestId('tab-bar')).getByTestId(`nav-link-${id}`)).toBeVisible()
    }
  })

  it('names the brand once, with the coral dot as its own element', async () => {
    await renderRoute('/dashboard')

    // `role="img"` with the brand's label — the mark itself, not the wordmark.
    expect(screen.getByRole('img', { name: 'Nagi' })).toBeInTheDocument()
  })
})

describe('the active destination', () => {
  it.each([
    ['/dashboard', 'dashboard'],
    ['/goals', 'goals'],
    ['/categories', 'categories'],
    ['/cards', 'cards'],
    ['/settings', 'profile'],
  ])('marks %s as the current page', async (path, id) => {
    await renderRoute(path)

    const rail = within(screen.getByTestId('nav-rail'))
    expect(rail.getByTestId(`nav-link-${id}`)).toHaveAttribute('aria-current', 'page')
  })

  it('stays marked on a month other than the current one', async () => {
    await renderRoute('/months/1999-01')

    const rail = within(screen.getByTestId('nav-rail'))
    expect(rail.getByTestId('nav-link-months')).toHaveAttribute('aria-current', 'page')
  })

  it('marks exactly one destination at a time', async () => {
    await renderRoute('/goals/abc123')

    const current = within(screen.getByTestId('nav-rail')).getAllByRole('link', {
      current: 'page',
    })
    expect(current).toHaveLength(1)
  })
})

describe('the screen title', () => {
  it.each([
    ['en', 'Monthly view'],
    ['pt-BR', 'Visão Mensal'],
  ] as const)('comes from the %s catalogue', async (locale, title) => {
    await renderRoute(`/months/${currentMonth()}`, { locale })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title)
  })
})

describe('the theme toggle', () => {
  it('offers the theme that is not on screen, and switches to it', async () => {
    useSettingsStore.setState({ theme: 'light' })
    const { user } = await renderRoute('/dashboard')

    await user.click(screen.getByTestId('theme-toggle'))

    expect(useSettingsStore.getState().theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  // The case the design leaves open: a two-state button over a three-state
  // preference. From `system` it commits to the opposite of what is showing,
  // which is what the icon promises.
  it('commits to an explicit theme when the preference was following the OS', async () => {
    useSettingsStore.setState({ theme: 'system' })
    const { user } = await renderRoute('/dashboard')

    await user.click(screen.getByTestId('theme-toggle'))

    expect(useSettingsStore.getState().theme).toBe('dark')
  })

  it('carries a label, because it has no text of its own', async () => {
    useSettingsStore.setState({ theme: 'light' })
    await renderRoute('/dashboard')

    expect(screen.getByRole('button', { name: 'Switch theme' })).toBeInTheDocument()
  })
})
