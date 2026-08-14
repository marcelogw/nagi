import type { Branded } from './brand'

/**
 * An integer number of currency cents.
 *
 * All monetary amounts in Nagi are stored as integer cents to avoid floating point
 * rounding errors. Formatting for display occurs at the UI edge via useFormatters().
 */
export type Cents = Branded<number, 'Cents'>

/** Thrown for a malformed monetary string representation. */
export class InvalidCentsError extends Error {
  readonly value: string

  constructor(value: string) {
    super(`Invalid cents: ${value}`)
    this.name = 'InvalidCentsError'
    this.value = value
  }
}

/**
 * Whether a value is a finite integer representing Cents.
 */
export function isCents(value: unknown): value is Cents {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value)
}

/** Named constant for zero cents. */
export const ZERO_CENTS: Cents = 0 as Cents

/** Adds two Cents values. */
export function add(a: Cents, b: Cents): Cents {
  return (a + b) as Cents
}

/** Subtracts b from a. */
export function subtract(a: Cents, b: Cents): Cents {
  return (a - b) as Cents
}

/** Sums an array of Cents values, returning ZERO_CENTS for an empty list. */
export function sum(values: Cents[]): Cents {
  return values.reduce<Cents>((acc, v) => (acc + v) as Cents, ZERO_CENTS)
}

const CANONICAL_CENTS_PATTERN = /^[+-]?\d+(\.\d{1,2})?$/

/**
 * Parses a canonical machine-decimal string — the exact inverse of `formatCents`
 * (`"1234.56"`, `"-50.5"`) — into integer Cents, rounding once.
 *
 * This is not a user-facing input parser: a locale's decimal/thousands
 * convention (`1.234,56` vs `1,234.56`) is genuinely ambiguous without knowing
 * which locale typed it, and nothing in Phase 1 has a form to attach that
 * decision to. `parseCents` exists for the boundary that already speaks one
 * unambiguous format — JSON export/import round-tripping a `Cents` serialised
 * as a string. Amount *input* parsing belongs with the component that first
 * renders an amount field, driven by the resolved locale from
 * `useSettingsStore`, not guessed at here.
 *
 * Throws InvalidCentsError if the string is not exactly that shape.
 */
export function parseCents(input: string): Cents {
  if (typeof input !== 'string' || !CANONICAL_CENTS_PATTERN.test(input)) {
    throw new InvalidCentsError(String(input))
  }

  return Math.round(Number.parseFloat(input) * 100) as Cents
}

/**
 * Parses free-typed input into Cents, tolerant of either decimal convention
 * (`1234.56` or `1234,56`) — unlike `parseCents`, which exists for a
 * machine round-trip and rejects anything that isn't its own canonical
 * shape. The *last* comma or dot found is treated as the decimal separator
 * and everything after it kept to two digits; every other one is dropped as
 * a thousands grouping. Empty or unparseable input is ZERO_CENTS rather
 * than a throw — a field mid-keystroke should not throw on every partial
 * value typed into it, and the caller decides what "nothing typed" means.
 *
 * ponytail: a fixed "last separator wins" heuristic, not a locale-aware
 * parse — `"1.234"` reads as 1 real + 23 cents rather than the pt-BR
 * thousands grouping for 1234. Fine for the common case (digits, at most one
 * separator) a card's optional limit field actually sees; upgrade to a real
 * locale-driven parser (`useSettingsStore`'s locale) if a field that takes
 * grouped input shows up.
 */
export function parseAmount(input: string): Cents {
  const trimmed = input.trim()
  if (trimmed === '') return ZERO_CENTS

  // `.includes`, not `.startsWith`: a currency prefix ("R$ -50") puts the
  // sign after other characters, and the digit-and-separator strip below
  // would otherwise drop it unnoticed, silently returning a positive value.
  const negative = trimmed.includes('-')
  const kept = trimmed.replace(/[^0-9.,]/g, '')
  const lastSeparator = Math.max(kept.lastIndexOf(','), kept.lastIndexOf('.'))

  const wholePart = (lastSeparator === -1 ? kept : kept.slice(0, lastSeparator)).replace(
    /[.,]/g,
    '',
  )
  const fractionPart = (lastSeparator === -1 ? '' : kept.slice(lastSeparator + 1))
    .replace(/[.,]/g, '')
    .slice(0, 2)
    .padEnd(2, '0')

  const cents = Number.parseInt(wholePart || '0', 10) * 100 + Number.parseInt(fractionPart, 10)
  if (!Number.isFinite(cents)) return ZERO_CENTS
  return (negative ? -cents : cents) as Cents
}

/**
 * Formats Cents into a canonical 2-decimal neutral string (`1234.56` or `-50.25`).
 *
 * This is a machine representation suitable for serialization or round-tripping.
 * User-facing display formatting is handled by src/i18n/formatters.ts.
 */
export function formatCents(value: Cents): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const dollars = Math.floor(abs / 100)
  const cents = abs % 100
  return `${sign}${dollars}.${String(cents).padStart(2, '0')}`
}
