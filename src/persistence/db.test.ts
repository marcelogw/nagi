import { del, get, keys, set } from 'idb-keyval'
import { beforeEach, describe, expect, it } from 'vitest'
import { indexedDbAdapter } from './db'

describe('persistence/db', () => {
  beforeEach(async () => {
    // Clear IndexedDB state before each test
    const allKeys = await keys()
    for (const key of allKeys) {
      await del(key)
    }
  })

  it('round-trips a value through setItem, getItem, and removeItem', async () => {
    await indexedDbAdapter.setItem('nagi-test', 'hello')
    expect(await indexedDbAdapter.getItem('nagi-test')).toBe('hello')

    await indexedDbAdapter.removeItem('nagi-test')
    expect(await indexedDbAdapter.getItem('nagi-test')).toBeNull()
  })

  it('getItem returns null for a key that was never set', async () => {
    expect(await indexedDbAdapter.getItem('nagi-missing')).toBeNull()
  })

  it('wipe removes specified keys from IndexedDB', async () => {
    await set('store-a', { foo: 'bar' })
    await set('store-b', { baz: 123 })
    await set('store-c', { keep: true })

    await indexedDbAdapter.wipe(['store-a', 'store-b'])

    expect(await get('store-a')).toBeUndefined()
    expect(await get('store-b')).toBeUndefined()
    expect(await get('store-c')).toEqual({ keep: true })
  })

  it('writeBackup stores a payload under derived key with timestamp', async () => {
    const timestamp = 1700000000000
    const payload = { settings: { theme: 'dark' } }

    await indexedDbAdapter.writeBackup('nagi-settings', payload, timestamp)

    expect(await get('nagi-settings__backup__1700000000000')).toEqual(payload)
  })

  it('listBackups lists backup keys for a key ordered most recent first', async () => {
    await indexedDbAdapter.writeBackup('nagi-store', { v: 1 }, 100)
    await indexedDbAdapter.writeBackup('nagi-store', { v: 2 }, 300)
    await indexedDbAdapter.writeBackup('nagi-store', { v: 3 }, 200)
    await indexedDbAdapter.writeBackup('other-store', { v: 1 }, 500)

    const backups = await indexedDbAdapter.listBackups('nagi-store')

    expect(backups).toEqual([
      'nagi-store__backup__300',
      'nagi-store__backup__200',
      'nagi-store__backup__100',
    ])
  })

  it('pruneBackups keeps only specified number of most recent backups', async () => {
    await indexedDbAdapter.writeBackup('nagi-store', { v: 1 }, 100)
    await indexedDbAdapter.writeBackup('nagi-store', { v: 2 }, 200)
    await indexedDbAdapter.writeBackup('nagi-store', { v: 3 }, 300)
    await indexedDbAdapter.writeBackup('nagi-store', { v: 4 }, 400)

    await indexedDbAdapter.pruneBackups('nagi-store', 2)

    const remaining = await indexedDbAdapter.listBackups('nagi-store')
    expect(remaining).toEqual(['nagi-store__backup__400', 'nagi-store__backup__300'])
    expect(await get('nagi-store__backup__100')).toBeUndefined()
    expect(await get('nagi-store__backup__200')).toBeUndefined()
  })

  it('pruneBackups handles keep count equal to or larger than existing backups', async () => {
    await indexedDbAdapter.writeBackup('nagi-store', { v: 1 }, 100)
    await indexedDbAdapter.pruneBackups('nagi-store', 5)

    expect(await indexedDbAdapter.listBackups('nagi-store')).toEqual(['nagi-store__backup__100'])
  })

  it('handles backup keys with invalid/non-numeric timestamps during sorting', async () => {
    await set('nagi-store__backup__invalid', { v: 0 })
    await indexedDbAdapter.writeBackup('nagi-store', { v: 1 }, 100)

    const backups = await indexedDbAdapter.listBackups('nagi-store')
    expect(backups).toContain('nagi-store__backup__invalid')
    expect(backups).toContain('nagi-store__backup__100')
  })
})
