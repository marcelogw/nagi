import type { Branded } from './brand'

/**
 * A calendar date string in ISO format (`YYYY-MM-DD`).
 *
 * Represents a discrete calendar day without time or timezone components.
 */
export type IsoDate = Branded<string, 'IsoDate'>

/**
 * An ISO 8601 full timestamp string with explicit timezone/offset (e.g. `2026-08-05T14:30:00.000Z`).
 *
 * Used exclusively for audit fields (`createdAt`, `completedAt`).
 */
export type Timestamp = Branded<string, 'Timestamp'>

const ISO_DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const TIMESTAMP_PATTERN =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-]([01]\d|2[0-3]):?[0-5]\d)$/i

/** Thrown for a malformed or invalid calendar ISO date. */
export class InvalidIsoDateError extends Error {
  readonly value: string

  constructor(value: string) {
    super(`Invalid ISO date: ${value}`)
    this.name = 'InvalidIsoDateError'
    this.value = value
  }
}

function parse(value: string): [year: number, month: number, day: number] {
  if (typeof value !== 'string') throw new InvalidIsoDateError(String(value))

  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) throw new InvalidIsoDateError(value)

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const date = new Date(year, month - 1, day)
  date.setFullYear(year)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new InvalidIsoDateError(value)
  }

  return [year, month, day]
}

/**
 * Parses and validates an ISO date string (`YYYY-MM-DD`).
 *
 * Throws InvalidIsoDateError if malformed or representing an invalid calendar date.
 */
export function parseIsoDate(value: string): IsoDate {
  parse(value)
  return value as IsoDate
}

/**
 * Whether a value is a well-formed, valid calendar ISO date (`YYYY-MM-DD`).
 */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false
  try {
    parse(value)
    return true
  } catch {
    return false
  }
}

/**
 * Returns the current instant as an ISO 8601 Timestamp.
 *
 * `clock` is an injectable parameter so tests can pin time without global mocks.
 */
export function now(clock: () => Date = () => new Date()): Timestamp {
  return clock().toISOString() as Timestamp
}

/**
 * Whether a value is a well-formed ISO 8601 timestamp with timezone.
 */
export function isTimestamp(value: unknown): value is Timestamp {
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value)) {
    return false
  }
  const datePart = value.split('T')[0]
  if (!datePart || !isIsoDate(datePart)) {
    return false
  }
  // check-patterns-ignore-next-line: validating string timestamp is legitimate here
  return !Number.isNaN(Date.parse(value))
}
