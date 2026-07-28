import { describe, expect, it } from 'vitest'
import { InvalidMonthError, monthToDate, nextMonth, previousMonth } from './month'

// The reference example for a domain test: pure input, pure output, no mocks,
// no DOM, branches included.

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
    const parsedAsUtc = new Date('2026-07-01')
    expect(parsedAsUtc.getMonth()).toBe(5) // June
    expect(parsedAsUtc.getDate()).toBe(30)

    // The domain does it correctly, so the same month reads as July.
    expect(monthToDate('2026-07').getMonth()).toBe(6) // July
    expect(monthToDate('2026-07').getDate()).toBe(1)
  })
})

describe('monthToDate', () => {
  it('keeps a two-digit year as itself, not as 19xx', () => {
    // `new Date(50, 0, 1)` is 1950. Not reachable from a realistic month, and a
    // silently wrong date the one time it is.
    expect(monthToDate('0050-01').getFullYear()).toBe(50)
  })
})

describe('previousMonth', () => {
  it('steps back within a year', () => {
    expect(previousMonth('2026-07')).toBe('2026-06')
  })

  it('crosses the year boundary', () => {
    expect(previousMonth('2026-01')).toBe('2025-12')
  })
})

describe('nextMonth', () => {
  it('steps forward within a year', () => {
    expect(nextMonth('2026-07')).toBe('2026-08')
  })

  it('crosses the year boundary', () => {
    expect(nextMonth('2026-12')).toBe('2027-01')
  })
})

describe('malformed input', () => {
  it.each(['2026-13', '2026-00', '2026-7', '2026', 'july', ''])('rejects %o', (value) => {
    expect(() => previousMonth(value)).toThrow(InvalidMonthError)
  })

  // Persisted records come back from IndexedDB unbound by the type signature.
  it.each([null, undefined, 42, {}, Symbol('2026-07')])(
    'rejects the non-string %o with a domain error, not a TypeError',
    (value) => {
      expect(() => previousMonth(value as unknown as string)).toThrow(InvalidMonthError)
    },
  )

  it('round-trips a padded year rather than dropping a digit', () => {
    expect(previousMonth('1000-01')).toBe('0999-12')
    expect(() => previousMonth(previousMonth('1000-01'))).not.toThrow()
  })
})
