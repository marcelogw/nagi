import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Category, CreditCard } from '@/domain/entities'
import { idbStorage } from '@/persistence/db'
import { migrate } from '@/persistence/migrate'

export const CATALOG_STORAGE_KEY = 'nagi-catalog'

export type CatalogState = {
  categories: Category[]
  creditCards: CreditCard[]
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    immer<CatalogState>(() => ({
      categories: [],
      creditCards: [],
    })),
    {
      name: CATALOG_STORAGE_KEY,
      storage: idbStorage,
      version: 1,
      migrate: (persistedState, version) =>
        migrate({
          key: CATALOG_STORAGE_KEY,
          storedVersion: version,
          targetVersion: 1,
          state: persistedState as CatalogState,
          now: Date.now,
        }),
    },
  ),
)
