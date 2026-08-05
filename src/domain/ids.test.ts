import { describe, expect, it } from 'vitest'
import { isUuid, newId } from './ids'

describe('newId', () => {
  it('generates a valid UUID v4', () => {
    const id = newId()
    expect(isUuid(id)).toBe(true)
  })

  it('generates distinct UUIDs on subsequent calls', () => {
    const id1 = newId()
    const id2 = newId()
    expect(id1).not.toBe(id2)
  })
})

describe('isUuid', () => {
  it.each([
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'F47AC10B-58CC-4372-A567-0E02B2C3D479',
    '00000000-0000-4000-8000-000000000000',
    'ffffffff-ffff-4fff-bfff-ffffffffffff',
  ])('accepts valid UUID v4 %o', (value) => {
    expect(isUuid(value)).toBe(true)
  })

  it.each([
    'not-a-uuid',
    'f47ac10b58cc4372a5670e02b2c3d479',
    'f47ac10b-58cc-1372-a567-0e02b2c3d479', // Version 1, not 4
    'f47ac10b-58cc-4372-c567-0e02b2c3d479', // Variant c, not 8/9/a/b
    'f47ac10b-58cc-4372-a567-0e02b2c3d4799', // Extra char
    'f47ac10b-58cc-4372-a567-0e02b2c3d47', // Missing char
    '',
  ])('rejects invalid UUID string %o', (value) => {
    expect(isUuid(value)).toBe(false)
  })

  it.each([null, undefined, 42, {}, [], Symbol('uuid')])('rejects non-string value %o', (value) => {
    expect(isUuid(value)).toBe(false)
  })
})
