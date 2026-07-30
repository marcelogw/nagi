/**
 * A calendar month, `YYYY-MM`. The app's primary navigation unit.
 *
 * Months are handled as strings and turned into a `Date` only at the boundary
 * that needs one, through `monthToDate`. Never `new Date('2026-07')` or
 * `new Date('2026-07-01')`: those parse as UTC midnight, which is the previous
 * day — and therefore sometimes the previous month — anywhere west of Greenwich.
 */
export type Month = string

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
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
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

export function previousMonth(month: Month): Month {
  const [year, m] = parse(month)
  return m === 1 ? format(year - 1, 12) : format(year, m - 1)
}

export function nextMonth(month: Month): Month {
  const [year, m] = parse(month)
  return m === 12 ? format(year + 1, 1) : format(year, m + 1)
}
