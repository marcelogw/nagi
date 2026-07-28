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
  const match = MONTH_PATTERN.exec(month)
  if (!match) throw new InvalidMonthError(month)
  return [Number(match[1]), Number(match[2])]
}

function format(year: number, month: number): Month {
  return `${year}-${String(month).padStart(2, '0')}`
}

/** The first instant of the month, in the running timezone. */
export function monthToDate(month: Month): Date {
  const [year, m] = parse(month)
  return new Date(year, m - 1, 1)
}

export function previousMonth(month: Month): Month {
  const [year, m] = parse(month)
  return m === 1 ? format(year - 1, 12) : format(year, m - 1)
}

export function nextMonth(month: Month): Month {
  const [year, m] = parse(month)
  return m === 12 ? format(year + 1, 1) : format(year, m + 1)
}
