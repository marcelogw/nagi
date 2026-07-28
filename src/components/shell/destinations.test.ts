import { describe, expect, it } from 'vitest'
import { activeDestinationId, DESTINATIONS, paramsFor } from './destinations'
import { isMonth } from '@/domain/month'

describe('activeDestinationId', () => {
  it.each([
    ['/dashboard', 'dashboard'],
    ['/months/2026-07', 'months'],
    ['/goals', 'goals'],
    ['/categories', 'categories'],
    ['/cards', 'cards'],
    ['/settings', 'profile'],
  ])('lights up %s as %s', (pathname, expected) => {
    expect(activeDestinationId(pathname)).toBe(expected)
  })

  // The reason it matches on a prefix rather than on the link's own target:
  // every month is the same destination, but a link can only name one of them.
  it('stays on the month destination for a month that is not the current one', () => {
    expect(activeDestinationId('/months/1999-01')).toBe('months')
  })

  it('stays on the goals destination for a single goal', () => {
    expect(activeDestinationId('/goals/abc123')).toBe('goals')
  })

  // `/goalsomething` shares five characters with `/goals` and is a different
  // screen. A bare `startsWith` would light the wrong destination.
  it.each(['/', '/goalsomething', '/dashboards', '/nowhere'])(
    'lights up nothing for %s',
    (pathname) => {
      expect(activeDestinationId(pathname)).toBeUndefined()
    },
  )
})

describe('paramsFor', () => {
  it('points the month destination at a month the router accepts', () => {
    const months = DESTINATIONS.find((destination) => destination.id === 'months')!

    expect(isMonth((paramsFor(months) as { month: string }).month)).toBe(true)
  })

  it('gives the destinations without params none', () => {
    for (const destination of DESTINATIONS.filter((d) => d.id !== 'months')) {
      expect(paramsFor(destination)).toEqual({})
    }
  })
})
