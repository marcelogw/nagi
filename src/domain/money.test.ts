import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { arbitraryLocalCents } from './testing/arbitraries'
import {
  add,
  type Cents,
  formatCents,
  InvalidCentsError,
  isCents,
  parseCents,
  subtract,
  sum,
  ZERO_CENTS,
} from './money'

describe('isCents', () => {
  it.each([0, 100, -500, 123456, -1])('accepts integer %o', (value) => {
    expect(isCents(value)).toBe(true)
  })

  it.each([10.5, -0.1, 0.001, NaN, Infinity, -Infinity])(
    'rejects non-integer number %o',
    (value) => {
      expect(isCents(value)).toBe(false)
    },
  )

  it.each(['100', null, undefined, {}, []])('rejects non-number %o', (value) => {
    expect(isCents(value)).toBe(false)
  })
})

describe('ZERO_CENTS', () => {
  it('is 0 and a valid Cents value', () => {
    expect(ZERO_CENTS).toBe(0)
    expect(isCents(ZERO_CENTS)).toBe(true)
  })
})

describe('arithmetic', () => {
  it('adds two Cents values', () => {
    expect(add(100 as Cents, 200 as Cents)).toBe(300)
    expect(add(100 as Cents, -50 as Cents)).toBe(50)
  })

  it('subtracts two Cents values', () => {
    expect(subtract(200 as Cents, 50 as Cents)).toBe(150)
    expect(subtract(50 as Cents, 100 as Cents)).toBe(-50)
  })

  it('sums an array of Cents values', () => {
    expect(sum([])).toBe(ZERO_CENTS)
    expect(sum([100 as Cents, 200 as Cents, 300 as Cents])).toBe(600)
    expect(sum([-100 as Cents, 100 as Cents])).toBe(0)
  })
})

describe('parseCents', () => {
  it.each([
    ['1234.56', 123456],
    ['1234', 123400],
    ['1234.5', 123450],
    ['0', 0],
    ['0.05', 5],
    ['-1234.56', -123456],
    ['+100.00', 10000],
    ['-0.01', -1],
  ])('parses canonical input %o to %i cents', (input, expected) => {
    expect(parseCents(input)).toBe(expected)
  })

  it.each([
    '',
    '   ',
    'abc',
    '$100',
    '1,234.56',
    '1.234,56',
    '1234,56',
    '12.345',
    '1234.',
    '.1234',
    '1234.5.6',
  ])('rejects non-canonical string %o with InvalidCentsError', (input) => {
    expect(() => parseCents(input)).toThrow(InvalidCentsError)
  })

  it.each([null, undefined, 42, {}, Symbol('100')])(
    'rejects non-string %o with InvalidCentsError',
    (input) => {
      expect(() => parseCents(input as unknown as string)).toThrow(InvalidCentsError)
    },
  )

  it('sets error properties correctly', () => {
    const error = new InvalidCentsError('bad-input')
    expect(error.name).toBe('InvalidCentsError')
    expect(error.value).toBe('bad-input')
    expect(error.message).toBe('Invalid cents: bad-input')
  })
})

describe('formatCents', () => {
  it.each([
    [123456 as Cents, '1234.56'],
    [0 as Cents, '0.00'],
    [50 as Cents, '0.50'],
    [5 as Cents, '0.05'],
    [-123456 as Cents, '-1234.56'],
    [-50 as Cents, '-0.50'],
  ])('formats cents %i to %o', (input, expected) => {
    expect(formatCents(input)).toBe(expected)
  })
})

describe('round-trip parse and format', () => {
  it.each(['1234.56', '0.00', '0.50', '-1234.56'])('round-trips %o cleanly', (canonical) => {
    expect(formatCents(parseCents(canonical))).toBe(canonical)
  })
})

// Property-based coverage (fast-check). Hand-written examples above pin known
// shapes; these attack the space between them. Every arbitrary comes from
// src/domain/testing/arbitraries.ts — see that file for why an inline
// fc.integer() here would be the wrong move.
describe('properties', () => {
  it('round-trips any Cents through formatCents/parseCents unchanged', () => {
    fc.assert(
      fc.property(arbitraryLocalCents(), (cents) => {
        expect(parseCents(formatCents(cents))).toBe(cents)
      }),
    )
  })

  it('add is commutative', () => {
    fc.assert(
      fc.property(arbitraryLocalCents(), arbitraryLocalCents(), (a, b) => {
        expect(add(a, b)).toBe(add(b, a))
      }),
    )
  })

  it('subtract undoes add', () => {
    fc.assert(
      fc.property(arbitraryLocalCents(), arbitraryLocalCents(), (a, b) => {
        expect(subtract(add(a, b), b)).toBe(a)
      }),
    )
  })

  it('sum agrees with a manual reduce over add, for any list', () => {
    fc.assert(
      fc.property(fc.array(arbitraryLocalCents()), (values) => {
        expect(sum(values)).toBe(values.reduce((acc, v) => add(acc, v), ZERO_CENTS))
      }),
    )
  })
})
