import { describe, expect, it } from 'vitest'
import { InvalidIsoDateError, isIsoDate, isTimestamp, now, parseIsoDate } from './date'

describe('parseIsoDate', () => {
  it.each(['2026-08-05', '2026-02-28', '2024-02-29', '0999-12-31'])(
    'accepts valid ISO date %o',
    (value) => {
      expect(parseIsoDate(value)).toBe(value)
    },
  )

  it.each([
    '2026-02-31', // Feb 31 does not exist
    '2026-04-31', // April has 30 days
    '2026-13-01', // Invalid month 13
    '2026-00-10', // Invalid month 00
    '2026-08-00', // Invalid day 00
    '2026-8-5',
    '2026/08/05',
    'banana',
    '',
  ])('rejects invalid ISO date %o with InvalidIsoDateError', (value) => {
    expect(() => parseIsoDate(value)).toThrow(InvalidIsoDateError)
  })

  it.each([null, undefined, 42, {}, Symbol('2026-08-05')])(
    'rejects non-string %o with InvalidIsoDateError',
    (value) => {
      expect(() => parseIsoDate(value as unknown as string)).toThrow(InvalidIsoDateError)
    },
  )

  it('sets error properties correctly', () => {
    const error = new InvalidIsoDateError('invalid-date')
    expect(error.name).toBe('InvalidIsoDateError')
    expect(error.value).toBe('invalid-date')
    expect(error.message).toBe('Invalid ISO date: invalid-date')
  })
})

describe('isIsoDate', () => {
  it.each(['2026-08-05', '2026-02-28', '2024-02-29'])('returns true for %o', (value) => {
    expect(isIsoDate(value)).toBe(true)
  })

  it.each(['2026-02-31', '2026-13-01', 'invalid', ''])('returns false for %o', (value) => {
    expect(isIsoDate(value)).toBe(false)
  })

  it.each([null, undefined, 123, {}])('returns false for non-string %o', (value) => {
    expect(isIsoDate(value)).toBe(false)
  })
})

describe('now', () => {
  it('returns a timestamp using default clock', () => {
    const current = now()
    expect(isTimestamp(current)).toBe(true)
  })

  it('uses custom clock function when provided', () => {
    // check-patterns-ignore-next-line: test needs an explicit ISO timestamp Date
    const customDate = new Date('2026-08-05T14:30:00.000Z')
    const current = now(() => customDate)
    expect(current).toBe('2026-08-05T14:30:00.000Z')
    expect(isTimestamp(current)).toBe(true)
  })
})

describe('isTimestamp', () => {
  it.each([
    '2026-08-05T14:30:00.000Z',
    '2026-08-05T14:30:00Z',
    '2026-08-05T14:30:00-03:00',
    '2026-08-05T14:30:00+05:30',
  ])('accepts valid timestamp %o', (value) => {
    expect(isTimestamp(value)).toBe(true)
  })

  it.each([
    '2026-08-05', // Date only, no time or timezone
    '2026-08-05T14:30:00', // No timezone offset
    '2026-02-31T14:30:00Z', // Invalid calendar date
    'banana',
    '',
  ])('rejects invalid timestamp %o', (value) => {
    expect(isTimestamp(value)).toBe(false)
  })

  it.each([null, undefined, 42, {}, Symbol('ts')])('rejects non-string %o', (value) => {
    expect(isTimestamp(value)).toBe(false)
  })
})
