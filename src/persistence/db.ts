import { del, keys, set } from 'idb-keyval'

export { idbStorage } from '../lib/idb-storage'

/** Deletes all specified store keys from IndexedDB. */
export async function wipeAllData(keysToWipe: string[]): Promise<void> {
  await Promise.all(keysToWipe.map((key) => del(key)))
}

/** Saves a pre-migration or periodic backup in IndexedDB under a timestamped derived key. */
export async function writeBackup(
  key: string,
  payload: unknown,
  timestampMs: number,
): Promise<void> {
  const backupKey = `${key}__backup__${timestampMs}`
  await set(backupKey, payload)
}

function parseBackupTimestamp(backupKey: string, prefix: string): number {
  const tsStr = backupKey.slice(prefix.length)
  const ts = Number(tsStr)
  return Number.isNaN(ts) ? 0 : ts
}

/** Lists backup keys for a given key, sorted chronologically descending (most recent first). */
export async function listBackups(key: string): Promise<string[]> {
  const prefix = `${key}__backup__`
  const allKeys = await keys()
  const matchingKeys = allKeys.filter(
    (k): k is string => typeof k === 'string' && k.startsWith(prefix),
  )

  const sortedKeys = matchingKeys.toSorted((a, b) => {
    const tsA = parseBackupTimestamp(a, prefix)
    const tsB = parseBackupTimestamp(b, prefix)
    return tsB - tsA
  })

  return sortedKeys
}

/** Prunes backup keys for a given key, keeping only the specified number of most recent entries. */
export async function pruneBackups(key: string, keep: number): Promise<void> {
  const backups = await listBackups(key)
  const toDelete = backups.slice(Math.max(0, keep))
  await Promise.all(toDelete.map((backupKey) => del(backupKey)))
}
