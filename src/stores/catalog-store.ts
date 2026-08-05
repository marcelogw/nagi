import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { SYSTEM_CATEGORY_ID, type Category, type CreditCard } from '@/domain/entities'
import { idbStorage } from '@/persistence/db'
import { migrate } from '@/persistence/migrate'

export const CATALOG_STORAGE_KEY = 'nagi-catalog'

export type CatalogState = {
  categories: Category[]
  creditCards: CreditCard[]
}

/** Invariant 4 (domain/invariants.ts) requires exactly one system category to
 * exist in any valid state — a fresh store must already satisfy it. */
const DEFAULT_SYSTEM_CATEGORY: Category = {
  id: SYSTEM_CATEGORY_ID,
  color: 'brand-ink',
  icon: null,
  isSystem: true,
  order: 0,
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    immer<CatalogState>(() => ({
      categories: [DEFAULT_SYSTEM_CATEGORY],
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
