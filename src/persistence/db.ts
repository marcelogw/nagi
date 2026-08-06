import { del, get, keys, set } from 'idb-keyval'
import type { StorageAdapter } from './storage-adapter'

function parseBackupTimestamp(backupKey: string, prefix: string): number {
  const tsStr = backupKey.slice(prefix.length)
  const ts = Number(tsStr)
  return Number.isNaN(ts) ? 0 : ts
}

/** The only StorageAdapter implementation today — local IndexedDB via idb-keyval. */
export const indexedDbAdapter: StorageAdapter = {
  getItem: async (name) => (await get(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value)
  },
  removeItem: async (name) => {
    await del(name)
  },

  /** Deletes all specified store keys from IndexedDB. */
  wipe: async (keysToWipe) => {
    await Promise.all(keysToWipe.map((key) => del(key)))
  },

  /** Saves a pre-migration or periodic backup under a timestamped derived key. */
  writeBackup: async (key, payload, timestampMs) => {
    const backupKey = `${key}__backup__${timestampMs}`
    await set(backupKey, payload)
  },

  /** Lists backup keys for a given key, sorted chronologically descending (most recent first). */
  listBackups: async (key) => {
    const prefix = `${key}__backup__`
    const allKeys = await keys()
    const matchingKeys = allKeys.filter(
      (k): k is string => typeof k === 'string' && k.startsWith(prefix),
    )

    return matchingKeys.toSorted((a, b) => {
      const tsA = parseBackupTimestamp(a, prefix)
      const tsB = parseBackupTimestamp(b, prefix)
      return tsB - tsA
    })
  },

  /** Prunes backup keys for a given key, keeping only the specified number of most recent entries. */
  pruneBackups: async (key, keep) => {
    const backups = await indexedDbAdapter.listBackups(key)
    const toDelete = backups.slice(Math.max(0, keep))
    await Promise.all(toDelete.map((backupKey) => del(backupKey)))
  },
}
