import type { Branded } from './brand'

/**
 * A calendar month, `YYYY-MM`. The app's primary navigation unit.
 *
 * Months are handled as strings and turned into a `Date` only at the boundary
 * that needs one, through `monthToDate`. Never `new Date('2026-07')` or
 * `new Date('2026-07-01')`: those parse as UTC midnight, which is the previous
 * day — and therefore sometimes the previous month — anywhere west of Greenwich.
 *
 * Branded rather than a plain string: a `Category.id` and a `Month` are both
 * strings at runtime, and without the brand the compiler cannot tell one from
 * the other at a call site expecting the wrong one.
 */
export type Month = Branded<string, 'Month'>

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

/** Thrown for a malformed month. The UI maps the type to a message; domain code never produces user-facing text. */
export class InvalidMonthError extends Error {
  readonly value: string

  constructor(value: string) {
    super(`Invalid month: ${value}`)
    this.name = 'InvalidMonthError'
    this.value = value
  }
}

function parse(month: Month): [year: number, month: number] {
  // Persisted data crosses back into the domain from IndexedDB, where an older
  // schema or a hand-edited record is not bound by the type above. Check the
  // type rather than let `exec` coerce it — a Symbol would throw a TypeError
  // and break the promise that this module only ever throws InvalidMonthError.
  if (typeof month !== 'string') throw new InvalidMonthError(String(month))

  const match = MONTH_PATTERN.exec(month)
  if (!match) throw new InvalidMonthError(month)
  return [Number(match[1]), Number(match[2])]
}

function format(year: number, month: number): Month {
  // Both parts are padded. The year matters at the boundary: without it
  // `previousMonth('1000-01')` returns '999-12', which this module's own
  // pattern then rejects.
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}` as Month
}

/**
 * Whether a value is a well-formed month.
 *
 * The boundary check. A month arrives from two places the type system does not
 * reach — the URL and persisted data — and both are user-editable. Callers that
 * need a value use `parse`; callers that need a decision use this.
 */
export function isMonth(value: unknown): value is Month {
  return typeof value === 'string' && MONTH_PATTERN.test(value)
}

/**
 * The month `now` falls in, read in the running timezone.
 *
 * `now` is a parameter so tests can pin it. Nothing else in the app reads the
 * clock: a component that wants "this month" asks for it here, once, rather
 * than constructing its own `Date` and drifting from this module's rules.
 */
export function currentMonth(now: Date = new Date()): Month {
  return format(now.getFullYear(), now.getMonth() + 1)
}

/** The calendar year `now` falls in, read in the running timezone. */
export function currentYear(now: Date = new Date()): number {
  return now.getFullYear()
}

/** The first instant of the month, in the running timezone. */
export function monthToDate(month: Month): Date {
  const [year, m] = parse(month)
  const date = new Date(year, m - 1, 1)
  // The two-digit-year rule: `new Date(50, 0, 1)` is 1950, not the year 50.
  // Unreachable for a realistic year, and a silently wrong date if it ever is.
  date.setFullYear(year)
  return date
}

/**
 * The month `n` steps from `month` — negative steps back, positive steps
 * forward, through a zero-based total-months count so a year boundary falls
 * out of the arithmetic rather than needing its own branch.
 */
export function offset(month: Month, n: number): Month {
  const [year, m] = parse(month)
  const totalMonths = year * 12 + (m - 1) + n
  const newYear = Math.floor(totalMonths / 12)
  const newMonth = totalMonths - newYear * 12 + 1
  return format(newYear, newMonth)
}

export function previousMonth(month: Month): Month {
  return offset(month, -1)
}

export function nextMonth(month: Month): Month {
  return offset(month, 1)
}

/** The signed number of months from `a` to `b` — negative when `b` precedes `a`. */
export function diffMonths(a: Month, b: Month): number {
  const [ay, am] = parse(a)
  const [by, bm] = parse(b)
  return by * 12 + (bm - 1) - (ay * 12 + (am - 1))
}

/**
 * Every month from `start` to `end`, inclusive, in chronological order.
 * Empty when `end` precedes `start` — a reversed range has nothing to yield,
 * not an error to throw.
 */
export function range(start: Month, end: Month): Month[] {
  const count = diffMonths(start, end)
  return Array.from({ length: Math.max(count + 1, 0) }, (_, i) => offset(start, i))
}
