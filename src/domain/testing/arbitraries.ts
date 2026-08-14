import fc from 'fast-check'
import type { Cents } from '../money'
import type { Month } from '../month'
import type { IsoDate } from '../date'

/**
 * Canonical fast-check generators for this project's domain primitives.
 *
 * Every property test under `src/domain/` consumes these instead of writing
 * an inline `fc.integer()`/`fc.date()` per test — same principle as this
 * project's one `newId()`, used everywhere. An arbitrary written ad hoc
 * inside a test file can trivially reintroduce exactly what the domain
 * forbids (e.g. a generated date built through `new Date(string)`, which
 * reads as UTC midnight and lands on the wrong day west of Greenwich — see
 * `month.ts`'s own doc comment). Defining the rule once here means every
 * consumer inherits it instead of re-deriving it.
 */

// A realistic amount range, not the full safe-integer range: division/
// multiplication by 100 in money.ts stays exact this far below
// Number.MAX_SAFE_INTEGER, so a round-trip failure means the code is wrong,
// not that the generator picked an unrepresentable edge case.
const MIN_CENTS = -1_000_000_000_00
const MAX_CENTS = 1_000_000_000_00

/** An arbitrary integer `Cents` value, within a realistic amount range. */
export function arbitraryLocalCents(): fc.Arbitrary<Cents> {
  return fc.integer({ min: MIN_CENTS, max: MAX_CENTS }).map((value) => value as Cents)
}

// Kept clear of the 4-digit year boundary (0000-9999, per month.ts's/date.ts's
// own MONTH_PATTERN/ISO_DATE_PATTERN): a property test that steps a generated
// month by a couple hundred months (`offset`, `nextMonth`) must not walk a
// value at the edge into a 5-digit year the domain's own parser would then
// reject on the way back in.
const MIN_YEAR = 100
const MAX_YEAR = 9900

/**
 * An arbitrary well-formed `Month` (`YYYY-MM`), built by zero-padded string
 * formatting — the same construction `month.ts` itself uses, never a `Date`.
 */
export function arbitraryLocalMonth(): fc.Arbitrary<Month> {
  return fc
    .record({
      year: fc.integer({ min: MIN_YEAR, max: MAX_YEAR }),
      month: fc.integer({ min: 1, max: 12 }),
    })
    .map(({ year, month }) => formatMonth(year, month))
}

function formatMonth(year: number, month: number): Month {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}` as Month
}

/**
 * An arbitrary valid calendar `IsoDate` (`YYYY-MM-DD`), including leap-year
 * Feb 29. The day is bounded by the local `Date` constructor's own
 * days-in-month (`new Date(year, month, 0).getDate()`) — the same rule
 * `date.ts`'s `parse` validates against — so every generated value is a real
 * calendar date, never derived from parsing a string.
 */
export function arbitraryLocalIsoDate(): fc.Arbitrary<IsoDate> {
  return fc
    .record({
      year: fc.integer({ min: MIN_YEAR, max: MAX_YEAR }),
      month: fc.integer({ min: 1, max: 12 }),
    })
    .chain(({ year, month }) => {
      const daysInMonth = new Date(year, month, 0).getDate()
      return fc.record({
        year: fc.constant(year),
        month: fc.constant(month),
        day: fc.integer({ min: 1, max: daysInMonth }),
      })
    })
    .map(
      ({ year, month, day }) =>
        `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` as IsoDate,
    )
}
