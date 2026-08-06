import { describe, expect, it } from 'vitest'
import { createAdapterStorage, type StorageAdapter } from './storage-adapter'

function makeFakeAdapter(): StorageAdapter {
  const store = new Map<string, string>()
  return {
    getItem: async (name: string) => store.get(name) ?? null,
    setItem: async (name: string, value: string) => {
      store.set(name, value)
    },
    removeItem: async (name: string) => {
      store.delete(name)
    },
    wipe: async (keys: string[]) => {
      for (const key of keys) store.delete(key)
    },
    writeBackup: async (key: string, payload: unknown, timestampMs: number) => {
      store.set(`${key}__backup__${timestampMs}`, JSON.stringify(payload))
    },
    listBackups: async (key: string) =>
      [...store.keys()].filter((k) => k.startsWith(`${key}__backup__`)),
    pruneBackups: async () => {},
  }
}

describe('createAdapterStorage', () => {
  it('wraps a StorageAdapter into a working Zustand StateStorage', async () => {
    const adapter = makeFakeAdapter()
    const storage = createAdapterStorage(adapter)
    expect(storage).toBeDefined()
    if (!storage) return

    await storage.setItem('nagi-test', { state: { value: 42 }, version: 1 })
    const raw = await storage.getItem('nagi-test')

    expect(raw).toEqual({ state: { value: 42 }, version: 1 })

    await storage.removeItem('nagi-test')
    expect(await storage.getItem('nagi-test')).toBeNull()
  })
})
