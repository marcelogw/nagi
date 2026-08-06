import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import {
  assertCanCreateCategory,
  assertMutableCategory,
  DEFAULT_CATEGORIES,
  normalizeCategoryId,
  reorderCategories as reorderCategoriesDomain,
  requireCategory,
} from '@/domain/categories'
import {
  InvalidCardReassignmentError,
  reorderCards as reorderCardsDomain,
  requireCard,
} from '@/domain/creditCards'
import {
  SYSTEM_CATEGORY_ID,
  type Category,
  type CardId,
  type CategoryId,
  type CreditCard,
  type HexColor,
} from '@/domain/entities'
import { newId } from '@/domain/ids'
import type { Cents } from '@/domain/money'
import { indexedDbAdapter } from '@/persistence/db'
import { migrate } from '@/persistence/migrate'
import { createAdapterStorage } from '@/persistence/storage-adapter'
import { useLedgerStore } from './ledger-store'
import { usePlanningStore } from './planning-store'

export const CATALOG_STORAGE_KEY = 'nagi-catalog'

/** The persisted/exported shape — no actions. What `persistence/export.ts` and `import.ts` read and write. */
export type CatalogData = {
  categories: Category[]
  creditCards: CreditCard[]
}

export type CatalogState = CatalogData & {
  createCategory: (name: string, options: { color: HexColor; icon: string | null }) => Category
  updateCategory: (
    id: CategoryId,
    changes: Partial<Pick<Category, 'customLabel' | 'color' | 'icon'>>,
  ) => void
  deleteCategory: (id: CategoryId) => void
  reorderCategories: (orderedIds: CategoryId[]) => void

  createCard: (name: string, options: { color: HexColor; limit: Cents | null }) => CreditCard
  updateCard: (id: CardId, changes: Partial<Pick<CreditCard, 'name' | 'color' | 'limit'>>) => void
  /** `reassignToId` must name a different, existing card — deleting the last remaining card is a UI-level block, not a domain no-op. */
  deleteCard: (id: CardId, reassignToId: CardId) => void
  reorderCards: (orderedIds: CardId[]) => void
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
    immer<CatalogState>((set, get) => ({
      categories: [DEFAULT_SYSTEM_CATEGORY, ...DEFAULT_CATEGORIES],
      creditCards: [],

      createCategory: (name, options) => {
        const id = normalizeCategoryId(name)
        assertCanCreateCategory(get().categories, id)

        const category: Category = {
          id,
          customLabel: name,
          color: options.color,
          icon: options.icon,
          isSystem: false,
          order: get().categories.length,
        }

        set((state) => {
          state.categories.push(category)
        })

        return category
      },

      updateCategory: (id, changes) => {
        const category = requireCategory(get().categories, id)
        if (changes.customLabel !== undefined) assertMutableCategory(category)

        set((state) => {
          const target = state.categories.find((c) => c.id === id)
          if (target) Object.assign(target, changes)
        })
      },

      deleteCategory: (id) => {
        const category = requireCategory(get().categories, id)
        assertMutableCategory(category)

        const survivors = get().categories.filter((c) => c.id !== id)
        const remaining = reorderCategoriesDomain(
          survivors,
          survivors.map((c) => c.id),
        )

        set((state) => {
          state.categories = remaining
        })

        useLedgerStore.getState().reassignCategory(id, SYSTEM_CATEGORY_ID)
      },

      reorderCategories: (orderedIds) => {
        const reordered = reorderCategoriesDomain(get().categories, orderedIds)
        set((state) => {
          state.categories = reordered
        })
      },

      createCard: (name, options) => {
        const card: CreditCard = {
          id: newId() as unknown as CardId,
          name,
          color: options.color,
          limit: options.limit,
          order: get().creditCards.length,
        }

        set((state) => {
          state.creditCards.push(card)
        })

        return card
      },

      updateCard: (id, changes) => {
        requireCard(get().creditCards, id)

        set((state) => {
          const target = state.creditCards.find((c) => c.id === id)
          if (target) Object.assign(target, changes)
        })
      },

      deleteCard: (id, reassignToId) => {
        requireCard(get().creditCards, id)
        requireCard(get().creditCards, reassignToId)
        if (id === reassignToId) {
          throw new InvalidCardReassignmentError(id)
        }

        const survivors = get().creditCards.filter((c) => c.id !== id)
        const remaining = reorderCardsDomain(
          survivors,
          survivors.map((c) => c.id),
        )

        set((state) => {
          state.creditCards = remaining
        })

        usePlanningStore.getState().reassignCard(id, reassignToId)
      },

      reorderCards: (orderedIds) => {
        const reordered = reorderCardsDomain(get().creditCards, orderedIds)
        set((state) => {
          state.creditCards = reordered
        })
      },
    })),
    {
      name: CATALOG_STORAGE_KEY,
      storage: createAdapterStorage(indexedDbAdapter),
      version: 1,
      migrate: (persistedState, version) =>
        migrate({
          key: CATALOG_STORAGE_KEY,
          storedVersion: version,
          targetVersion: 1,
          state: persistedState as CatalogState,
          now: Date.now,
          adapter: indexedDbAdapter,
        }),
    },
  ),
)
