import { createJSONStorage, type StateStorage } from 'zustand/middleware'

export interface StorageAdapter extends StateStorage {
  wipe(keys: string[]): Promise<void>
  writeBackup(key: string, payload: unknown, timestampMs: number): Promise<void>
  listBackups(key: string): Promise<string[]>
  pruneBackups(key: string, keep: number): Promise<void>
}

/** Wraps a StorageAdapter for Zustand's `persist({ storage })` option. */
export function createAdapterStorage(adapter: StorageAdapter) {
  return createJSONStorage(() => adapter)
}
