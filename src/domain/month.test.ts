import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { arbitraryLocalMonth } from './testing/arbitraries'
import {
  currentMonth,
  currentYear,
  diffMonths,
  InvalidMonthError,
  isMonth,
  type Month,
  monthToDate,
  nextMonth,
  offset,
  previousMonth,
  range,
} from './month'

// The reference example for a domain test: pure input, pure output, no mocks,
// no DOM, branches included.

/** Test-only cast for a literal that is already known to be well-formed. */
const m = (value: string): Month => value as Month

describe('the timezone the suite runs under', () => {
  it('is not UTC, because under UTC the date bugs are invisible', () => {
    expect(new Date().getTimezoneOffset()).not.toBe(0)
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Sao_Paulo')
  })

  it('makes a UTC-parsed date-only string land on the wrong month', () => {
    // This is the defect, demonstrated rather than described: `new Date(string)`
    // parses as UTC midnight, which is 21:00 the previous day in São Paulo — so
    // the first of July reads as June. Under TZ=UTC this assertion fails, which
    // is exactly what makes the harness worth having.
    // check-patterns-ignore-next-line: writing the banned pattern is the point here
    const parsedAsUtc = new Date('2026-07-01')
    expect(parsedAsUtc.getMonth()).toBe(5) // June
    expect(parsedAsUtc.getDate()).toBe(30)

    // The domain does it correctly, so the same month reads as July.
    expect(monthToDate(m('2026-07')).getMonth()).toBe(6) // July
    expect(monthToDate(m('2026-07')).getDate()).toBe(1)
  })
})

describe('monthToDate', () => {
  it('keeps a two-digit year as itself, not as 19xx', () => {
    // `new Date(50, 0, 1)` is 1950. Not reachable from a realistic month, and a
    // silently wrong date the one time it is.
    expect(monthToDate(m('0050-01')).getFullYear()).toBe(50)
  })
})

describe('previousMonth', () => {
  it('steps back within a year', () => {
    expect(previousMonth(m('2026-07'))).toBe('2026-06')
  })

  it('crosses the year boundary', () => {
    expect(previousMonth(m('2026-01'))).toBe('2025-12')
  })
})

describe('nextMonth', () => {
  it('steps forward within a year', () => {
    expect(nextMonth(m('2026-07'))).toBe('2026-08')
  })

  it('crosses the year boundary', () => {
    expect(nextMonth(m('2026-12'))).toBe('2027-01')
  })
})

describe('malformed input', () => {
  it.each(['2026-13', '2026-00', '2026-7', '2026', 'july', ''])('rejects %o', (value) => {
    expect(() => previousMonth(m(value))).toThrow(InvalidMonthError)
  })

  // Persisted records come back from IndexedDB unbound by the type signature.
  it.each([null, undefined, 42, {}, Symbol('2026-07')])(
    'rejects the non-string %o with a domain error, not a TypeError',
    (value) => {
      expect(() => previousMonth(value as unknown as Month)).toThrow(InvalidMonthError)
    },
  )

  it('round-trips a padded year rather than dropping a digit', () => {
    expect(previousMonth(m('1000-01'))).toBe('0999-12')
    expect(() => previousMonth(previousMonth(m('1000-01')))).not.toThrow()
  })
})

describe('isMonth', () => {
  it.each(['2026-07', '2026-01', '2026-12', '0999-12'])('accepts %o', (value) => {
    expect(isMonth(value)).toBe(true)
  })

  // The URL is the reason this exists: `/months/banana` has to be a decision at
  // the route boundary, not an exception thrown inside a selector.
  it.each(['2026-13', '2026-00', '2026-7', '2026', 'banana', '', '2026-07-01'])(
    'rejects %o',
    (value) => {
      expect(isMonth(value)).toBe(false)
    },
  )

  it.each([null, undefined, 42, {}, ['2026-07']])('rejects the non-string %o', (value) => {
    expect(isMonth(value)).toBe(false)
  })
})

describe('offset', () => {
  it('steps forward and back within a year', () => {
    expect(offset(m('2026-07'), 1)).toBe('2026-08')
    expect(offset(m('2026-07'), -1)).toBe('2026-06')
  })

  it('crosses multiple year boundaries in either direction', () => {
    expect(offset(m('2026-07'), 18)).toBe('2028-01')
    expect(offset(m('2026-07'), -19)).toBe('2024-12')
  })

  it('is a no-op at zero', () => {
    expect(offset(m('2026-07'), 0)).toBe('2026-07')
  })

  it('agrees with previousMonth and nextMonth', () => {
    expect(offset(m('2026-01'), -1)).toBe(previousMonth(m('2026-01')))
    expect(offset(m('2026-12'), 1)).toBe(nextMonth(m('2026-12')))
  })

  it('rejects a malformed month, same as every other entry point', () => {
    expect(() => offset(m('banana'), 1)).toThrow(InvalidMonthError)
  })
})

describe('diffMonths', () => {
  it('counts forward as positive', () => {
    expect(diffMonths(m('2026-01'), m('2026-04'))).toBe(3)
  })

  it('counts backward as negative', () => {
    expect(diffMonths(m('2026-04'), m('2026-01'))).toBe(-3)
  })

  it('is zero for the same month', () => {
    expect(diffMonths(m('2026-07'), m('2026-07'))).toBe(0)
  })

  it('crosses a year boundary', () => {
    expect(diffMonths(m('2025-11'), m('2026-02'))).toBe(3)
  })

  it('is the inverse of offset', () => {
    const start = m('2026-05')
    expect(offset(start, diffMonths(start, m('2027-02')))).toBe('2027-02')
  })
})

describe('range', () => {
  it('is inclusive of both ends', () => {
    expect(range(m('2026-01'), m('2026-03'))).toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('is a single month when start equals end', () => {
    expect(range(m('2026-07'), m('2026-07'))).toEqual(['2026-07'])
  })

  it('is empty when end precedes start, rather than throwing', () => {
    expect(range(m('2026-07'), m('2026-01'))).toEqual([])
  })

  it('crosses a year boundary', () => {
    expect(range(m('2025-11'), m('2026-02'))).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })
})

describe('currentMonth', () => {
  it('reads the month in local time, not UTC', () => {
    // 23:30 on the last day of July in Sao Paulo is already August in UTC. A
    // naive implementation reading UTC parts returns 2026-08 here — the same
    // off-by-one month that put the wrong label on every chart in the
    // predecessor.
    expect(currentMonth(new Date(2026, 6, 31, 23, 30))).toBe('2026-07')
  })

  it('pads a single-digit month', () => {
    expect(currentMonth(new Date(2026, 0, 15))).toBe('2026-01')
  })

  it('produces a month this module accepts back', () => {
    expect(isMonth(currentMonth())).toBe(true)
  })
})

describe('currentYear', () => {
  it('reads the year in local time', () => {
    expect(currentYear(new Date(2026, 0, 15))).toBe(2026)
  })

  it('defaults to the real clock when not given one', () => {
    expect(currentYear()).toBe(new Date().getFullYear())
  })
})

// Property-based coverage (fast-check), attacking month-rollover arithmetic
// across the arbitrary's full year range rather than the hand-picked years
// above. Every arbitrary comes from src/domain/testing/arbitraries.ts.
describe('properties', () => {
  it('offset(month, 0) is a no-op for any month', () => {
    fc.assert(
      fc.property(arbitraryLocalMonth(), (month) => {
        expect(offset(month, 0)).toBe(month)
      }),
    )
  })

  it('diffMonths is the exact inverse of offset, across year boundaries', () => {
    fc.assert(
      fc.property(arbitraryLocalMonth(), fc.integer({ min: -200, max: 200 }), (month, n) => {
        expect(diffMonths(month, offset(month, n))).toBe(n)
      }),
    )
  })

  it('previousMonth and nextMonth undo each other, across any rollover', () => {
    fc.assert(
      fc.property(arbitraryLocalMonth(), (month) => {
        expect(previousMonth(nextMonth(month))).toBe(month)
        expect(nextMonth(previousMonth(month))).toBe(month)
      }),
    )
  })

  it('range(month, month) is always the single-element list', () => {
    fc.assert(
      fc.property(arbitraryLocalMonth(), (month) => {
        expect(range(month, month)).toEqual([month])
      }),
    )
  })

  it('every generated month round-trips through isMonth as well-formed', () => {
    fc.assert(
      fc.property(arbitraryLocalMonth(), (month) => {
        expect(isMonth(month)).toBe(true)
      }),
    )
  })
})
