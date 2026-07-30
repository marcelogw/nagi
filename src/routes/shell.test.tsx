import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderRoute, screen, within } from '@/test/render'
import { currentMonth } from '@/domain/month'
import { useSettingsStore } from '@/stores/settings-store'

// The reference example for a component test: rendered the way the app renders
// it, queried by role and label, asserted in both locales rather than against a
// hardcoded string. Never query by class name.

describe('the shell', () => {
  it.each(['/dashboard', '/goals', '/categories', '/cards', '/settings', '/months/2026-07'])(
    'is present on %s',
    async (path) => {
      await renderRoute(path)

      expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    },
  )

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

  it('shows the mark exactly once, so the brand never competes with itself', async () => {
    await renderRoute('/dashboard')

    // `role="img"` with the brand's label — the symbol, not the wordmark.
    expect(screen.getAllByRole('img', { name: 'Nagi' })).toHaveLength(1)
  })

  // The coral dot is the brand's one signature accent, and its allowed uses are
  // a closed list. Asserted as its own element because that is what carries the
  // colour — losing the span loses the accent while the word still reads right.
  it('carries the wordmark with the coral dot as its own element', async () => {
    await renderRoute('/dashboard')
    const wordmarks = screen.getAllByTestId('wordmark')

    // One per breakpoint: the rail's and the header's. The stylesheet shows one.
    expect(wordmarks).toHaveLength(2)
    for (const wordmark of wordmarks) {
      expect(wordmark).toHaveTextContent('nagi.')
      expect(within(wordmark).getByTestId('wordmark-dot')).toHaveTextContent('.')
    }
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
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('dark')
  })

  it('offers the theme that is not on screen, and switches to it', async () => {
    useSettingsStore.setState({ theme: 'light' })
    const { user } = await renderRoute('/dashboard')

    await user.click(screen.getByTestId('theme-toggle'))

    expect(useSettingsStore.getState().theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  // The case the design leaves open: a two-state button over a three-state
  // preference. From `system` it commits to the opposite of what is showing —
  // so on an OS already in dark it must go to light, not to dark. The stub in
  // vitest.setup.ts reports light, which would make this indistinguishable from
  // the case above; this one says otherwise.
  it('commits to the opposite of what the OS was giving, not to a fixed theme', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    useSettingsStore.setState({ theme: 'system' })
    const { user } = await renderRoute('/dashboard')

    await user.click(screen.getByTestId('theme-toggle'))

    expect(useSettingsStore.getState().theme).toBe('light')
  })

  // The rail is gone below 960px and the Profile screen that would carry the
  // setting does not exist yet, so without this the theme is unreachable on a
  // phone. Both are in the DOM; the stylesheet shows one.
  it('is reachable at both breakpoints', async () => {
    await renderRoute('/dashboard')

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle-compact')).toBeInTheDocument()
  })

  it('carries a label at both breakpoints, because it has no text of its own', async () => {
    useSettingsStore.setState({ theme: 'light' })
    await renderRoute('/dashboard')

    expect(screen.getAllByRole('button', { name: 'Switch theme' })).toHaveLength(2)
  })
})
