import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { currentMonth } from '@/domain/month'
import { validateDashboardSearch } from './router'

// Routing is navigation state, so these assert the URL the app settles on
// rather than what got rendered.

const land = async (at: string) => (await renderRoute(at)).router

describe('the route tree', () => {
  it('sends the index to the dashboard instead of rendering a second copy of it', async () => {
    const router = await land('/')

    expect(router.state.location.pathname).toBe('/dashboard')
  })

  it.each(['/dashboard', '/categories', '/cards', '/goals', '/settings', '/goals/abc123'])(
    'serves %s directly, so a deep link works',
    async (path) => {
      const router = await land(path)

      expect(router.state.location.pathname).toBe(path)
    },
  )
})

describe('a month in the URL', () => {
  it('is served as given when it is well formed', async () => {
    const router = await land('/months/2026-07')

    expect(router.state.location.pathname).toBe('/months/2026-07')
  })

  // The whole reason the check sits in `beforeLoad`: each of these used to be a
  // crash inside a selector rather than a decision at the boundary.
  it.each(['/months/2026-13', '/months/banana', '/months/2026', '/months/2026-07-01'])(
    'redirects %s to the current month rather than failing',
    async (path) => {
      const router = await land(path)

      expect(router.state.location.pathname).toBe(`/months/${currentMonth()}`)
    },
  )
})

describe('a path that matches nothing', () => {
  // Without a not-found component this renders TanStack's built-in one: an
  // English string from the library inside the full shell, under an empty h1.
  // The design defines no 404 screen, so an unknown path goes where `/` goes.
  it.each(['/nowhere', '/goalsomething', '/months'])('sends %s to the dashboard', async (path) => {
    const router = await land(path)

    expect(router.state.location.pathname).toBe('/dashboard')
  })
})

describe('the dashboard year search param', () => {
  it('keeps a plausible year', () => {
    expect(validateDashboardSearch({ year: 2026 })).toEqual({ year: 2026 })
  })

  it('accepts the string the URL actually delivers', () => {
    expect(validateDashboardSearch({ year: '2026' })).toEqual({ year: 2026 })
  })

  // `?year[]=2026` parses to a one-element array, which coerces to the same
  // number. Rejecting it would be extra code to refuse a value that says
  // exactly what the accepted one says.
  it('accepts a repeated param that carries a single year', () => {
    expect(validateDashboardSearch({ year: ['2026'] })).toEqual({ year: 2026 })
  })

  it.each([
    ['a word', { year: 'banana' }],
    ['an empty value', { year: '' }],
    ['a fraction', { year: 2026.5 }],
    ['a two-digit year', { year: 99 }],
    ['two conflicting years', { year: ['2026', '2027'] }],
    ['nothing at all', {}],
  ])('drops %s rather than breaking a screen that works without it', (_case, search) => {
    expect(validateDashboardSearch(search)).toEqual({})
  })
})
