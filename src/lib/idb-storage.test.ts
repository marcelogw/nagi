import { describe, expect, it } from 'vitest'
import { idbKeyvalStorage } from './idb-storage'

describe('idbKeyvalStorage', () => {
  it('round-trips a value through set, get, and remove', async () => {
    await idbKeyvalStorage.setItem('nagi-test', 'hello')
    expect(await idbKeyvalStorage.getItem('nagi-test')).toBe('hello')

    await idbKeyvalStorage.removeItem('nagi-test')
    expect(await idbKeyvalStorage.getItem('nagi-test')).toBeNull()
  })

  it('returns null for a key that was never set', async () => {
    expect(await idbKeyvalStorage.getItem('nagi-missing')).toBeNull()
  })
})
