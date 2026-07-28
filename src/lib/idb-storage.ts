import { get, set, del } from 'idb-keyval'
import { createJSONStorage, type StateStorage } from 'zustand/middleware'

export const idbKeyvalStorage: StateStorage = {
  getItem: async (name) => (await get(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value)
  },
  removeItem: async (name) => {
    await del(name)
  },
}

/** Zustand `persist` storage backed by IndexedDB — local-first, no cloud/sync abstraction. */
export const idbStorage = createJSONStorage(() => idbKeyvalStorage)
