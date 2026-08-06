import { del, get, keys, set } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CategoryNotFoundError,
  DuplicateCategoryIdError,
  InvalidCategoryIdError,
  ProtectedCategoryError,
} from '@/domain/categories'
import { CardNotFoundError, InvalidCardReassignmentError } from '@/domain/creditCards'
import type {
  CardId,
  Category,
  CategoryId,
  CreditCard,
  Expense,
  Installment,
} from '@/domain/entities'
import { SYSTEM_CATEGORY_ID } from '@/domain/entities'
import type { Uuid } from '@/domain/ids'
import type { Cents } from '@/domain/money'
import type { Month } from '@/domain/month'
import { CATALOG_STORAGE_KEY, useCatalogStore } from './catalog-store'
import { useLedgerStore } from './ledger-store'
import { usePlanningStore } from './planning-store'

describe('useCatalogStore', () => {
  beforeEach(async () => {
    useCatalogStore.setState({
      categories: [],
      creditCards: [],
    })
    const allKeys = await keys()
    for (const k of allKeys) {
      await del(k)
    }
  })

  it('initializes with empty categories and creditCards arrays', () => {
    const state = useCatalogStore.getState()
    expect(state.categories).toEqual([])
    expect(state.creditCards).toEqual([])
  })

  it('boots with the system category and the 11 defaults already present (Invariant 4)', async () => {
    vi.resetModules()
    const { useCatalogStore: freshStore } = await import('./catalog-store')
    const categories = freshStore.getState().categories

    expect(categories).toHaveLength(12)
    expect(categories[0]).toEqual(
      expect.objectContaining({ id: SYSTEM_CATEGORY_ID, isSystem: true, order: 0 }),
    )
    expect(categories.map((c) => c.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('updates state via setState correctly and persists to IndexedDB', async () => {
    const sampleCategory: Category = {
      id: 'groceries' as CategoryId,
      // check-patterns-ignore-next-line
      color: '#00ff00',
      icon: 'shopping-cart',
      isSystem: false,
      order: 1,
    }

    const sampleCard: CreditCard = {
      id: 'card-1' as CardId,
      name: 'Main Card',
      // check-patterns-ignore-next-line
      color: '#0000ff',
      limit: 100000 as Cents,
      order: 1,
    }

    useCatalogStore.setState({
      categories: [sampleCategory],
      creditCards: [sampleCard],
    })

    const state = useCatalogStore.getState()
    expect(state.categories).toEqual([sampleCategory])
    expect(state.creditCards).toEqual([sampleCard])

    // Wait briefly for async IndexedDB write
    await new Promise((resolve) => setTimeout(resolve, 50))

    const rawStored = await get(CATALOG_STORAGE_KEY)
    expect(rawStored).toBeDefined()
    const parsed = typeof rawStored === 'string' ? JSON.parse(rawStored) : rawStored
    expect(parsed.version).toBe(1)
    expect(parsed.state.creditCards).toEqual([sampleCard])
  })

  it('rehydrates state from IndexedDB end-to-end', async () => {
    const sampleCard: CreditCard = {
      id: 'card-2' as CardId,
      name: 'Travel Card',
      // check-patterns-ignore-next-line
      color: '#ff00ff',
      limit: null,
      order: 2,
    }

    const payload = JSON.stringify({
      state: {
        categories: [],
        creditCards: [sampleCard],
      },
      version: 1,
    })

    await set(CATALOG_STORAGE_KEY, payload)

    await useCatalogStore.persist.rehydrate()

    expect(useCatalogStore.getState().creditCards).toEqual([sampleCard])
  })

  describe('category CRUD', () => {
    beforeEach(() => {
      useCatalogStore.setState({
        categories: [
          { id: SYSTEM_CATEGORY_ID, color: 'brand-ink', icon: null, isSystem: true, order: 0 },
          {
            id: 'groceries' as CategoryId,
            color: 'oklch(0.64 0.10 168)',
            icon: 'shopping-cart',
            isSystem: false,
            order: 1,
          },
          {
            id: 'health' as CategoryId,
            color: 'oklch(0.63 0.11 350)',
            icon: 'heart-pulse',
            isSystem: false,
            order: 2,
          },
        ],
        creditCards: [],
      })
      useLedgerStore.setState({ incomes: {}, expenses: {}, savingsEntries: {}, recurrences: [] })
    })

    describe('createCategory', () => {
      it('adds a new category with a normalised id and the given name as customLabel', () => {
        const created = useCatalogStore
          .getState()
          .createCategory('Pets & Vet', { color: 'oklch(0.62 0.11 300)', icon: 'cat' })

        expect(created).toMatchObject({
          id: 'pets-vet',
          customLabel: 'Pets & Vet',
          color: 'oklch(0.62 0.11 300)',
          icon: 'cat',
          isSystem: false,
          order: 3,
        })
        expect(useCatalogStore.getState().categories).toContainEqual(created)
      })

      it('throws DuplicateCategoryIdError when the name collides with an existing category', () => {
        expect(() =>
          useCatalogStore.getState().createCategory('Groceries', { color: 'x', icon: null }),
        ).toThrow(DuplicateCategoryIdError)
      })

      it('throws DuplicateCategoryIdError when the name collides with a reserved default id', () => {
        expect(() =>
          useCatalogStore.getState().createCategory('Housing', { color: 'x', icon: null }),
        ).toThrow(DuplicateCategoryIdError)
      })

      it('throws InvalidCategoryIdError when the name normalises to empty', () => {
        expect(() =>
          useCatalogStore.getState().createCategory('🎉', { color: 'x', icon: null }),
        ).toThrow(InvalidCategoryIdError)
      })
    })

    describe('updateCategory', () => {
      it('applies changes to an existing non-system category', () => {
        useCatalogStore
          .getState()
          .updateCategory('groceries' as CategoryId, { customLabel: 'Supermarket', icon: 'store' })

        const updated = useCatalogStore.getState().categories.find((c) => c.id === 'groceries')
        expect(updated).toMatchObject({ customLabel: 'Supermarket', icon: 'store' })
      })

      it('throws ProtectedCategoryError when renaming the system category', () => {
        expect(() =>
          useCatalogStore.getState().updateCategory(SYSTEM_CATEGORY_ID, { customLabel: 'Renamed' }),
        ).toThrow(ProtectedCategoryError)
      })

      it('throws CategoryNotFoundError for an unknown id', () => {
        expect(() =>
          useCatalogStore.getState().updateCategory('ghost' as CategoryId, { icon: 'x' }),
        ).toThrow(CategoryNotFoundError)
      })
    })

    describe('deleteCategory', () => {
      it('removes the category and closes the order gap', () => {
        useCatalogStore.getState().deleteCategory('groceries' as CategoryId)

        const categories = useCatalogStore.getState().categories
        expect(categories.map((c) => c.id)).toEqual([SYSTEM_CATEGORY_ID, 'health'])
        expect(categories.map((c) => c.order)).toEqual([0, 1])
      })

      it('reassigns expenses pointing at the deleted category to the system category', () => {
        const expense: Expense = {
          id: 'e1' as never,
          month: '2026-08' as Month,
          description: 'Milk',
          amount: 500 as Cents,
          categoryId: 'groceries' as CategoryId,
          kind: 'variable',
          date: '2026-08-01' as never,
        }
        useLedgerStore.setState({
          incomes: {},
          expenses: { ['2026-08' as Month]: [expense] },
          savingsEntries: {},
          recurrences: [],
        })

        useCatalogStore.getState().deleteCategory('groceries' as CategoryId)

        expect(useLedgerStore.getState().expenses['2026-08' as Month]?.[0]?.categoryId).toBe(
          SYSTEM_CATEGORY_ID,
        )
      })

      it('throws ProtectedCategoryError when deleting the system category', () => {
        expect(() => useCatalogStore.getState().deleteCategory(SYSTEM_CATEGORY_ID)).toThrow(
          ProtectedCategoryError,
        )
      })

      it('throws CategoryNotFoundError for an unknown id', () => {
        expect(() => useCatalogStore.getState().deleteCategory('ghost' as CategoryId)).toThrow(
          CategoryNotFoundError,
        )
      })
    })

    describe('reorderCategories', () => {
      it('reassigns order to match the given id sequence', () => {
        useCatalogStore
          .getState()
          .reorderCategories([SYSTEM_CATEGORY_ID, 'health', 'groceries'] as CategoryId[])

        const categories = useCatalogStore.getState().categories
        expect(categories.map((c) => c.id)).toEqual([SYSTEM_CATEGORY_ID, 'health', 'groceries'])
        expect(categories.map((c) => c.order)).toEqual([0, 1, 2])
      })
    })
  })

  describe('credit card CRUD', () => {
    beforeEach(() => {
      useCatalogStore.setState({
        categories: [],
        creditCards: [
          {
            id: 'nubank' as CardId,
            name: 'Nubank',
            color: 'oklch(0.55 0.14 300)',
            limit: 800000 as Cents,
            order: 0,
          },
          {
            id: 'itau' as CardId,
            name: 'Itaú',
            color: 'oklch(0.58 0.11 250)',
            limit: null,
            order: 1,
          },
        ],
      })
      usePlanningStore.setState({ installments: [], goals: [] })
    })

    describe('createCard', () => {
      it('adds a new card with a generated id', () => {
        const created = useCatalogStore
          .getState()
          .createCard('Travel Card', { color: 'oklch(0.60 0.10 200)', limit: null })

        expect(created).toMatchObject({
          name: 'Travel Card',
          color: 'oklch(0.60 0.10 200)',
          limit: null,
          order: 2,
        })
        expect(useCatalogStore.getState().creditCards).toContainEqual(created)
      })
    })

    describe('updateCard', () => {
      it('applies changes to an existing card, including a limit of exactly 0', () => {
        useCatalogStore.getState().updateCard('nubank' as CardId, { limit: 0 as Cents })

        const updated = useCatalogStore.getState().creditCards.find((c) => c.id === 'nubank')
        expect(updated?.limit).toBe(0)
      })

      it('throws CardNotFoundError for an unknown id', () => {
        expect(() =>
          useCatalogStore.getState().updateCard('ghost' as CardId, { name: 'x' }),
        ).toThrow(CardNotFoundError)
      })
    })

    describe('deleteCard', () => {
      it('removes the card, closes the order gap, and reassigns installments', () => {
        const installment: Installment = {
          id: 'i1' as Uuid,
          name: 'Laptop',
          cardId: 'nubank' as CardId,
          totalInstallments: 6,
          amountPerInstallment: 50000 as Cents,
          startMonth: '2026-01' as Month,
        }
        usePlanningStore.setState({ installments: [installment], goals: [] })

        useCatalogStore.getState().deleteCard('nubank' as CardId, 'itau' as CardId)

        const cards = useCatalogStore.getState().creditCards
        expect(cards.map((c) => c.id)).toEqual(['itau'])
        expect(cards.map((c) => c.order)).toEqual([0])
        expect(usePlanningStore.getState().installments[0]?.cardId).toBe('itau')
      })

      it('throws InvalidCardReassignmentError when reassignToId equals id', () => {
        expect(() =>
          useCatalogStore.getState().deleteCard('nubank' as CardId, 'nubank' as CardId),
        ).toThrow(InvalidCardReassignmentError)
      })

      it('throws CardNotFoundError when the reassignment target does not exist', () => {
        expect(() =>
          useCatalogStore.getState().deleteCard('nubank' as CardId, 'ghost' as CardId),
        ).toThrow(CardNotFoundError)
      })

      it('throws CardNotFoundError for an unknown id', () => {
        expect(() =>
          useCatalogStore.getState().deleteCard('ghost' as CardId, 'itau' as CardId),
        ).toThrow(CardNotFoundError)
      })
    })

    describe('reorderCards', () => {
      it('reassigns order to match the given id sequence', () => {
        useCatalogStore.getState().reorderCards(['itau', 'nubank'] as CardId[])

        const cards = useCatalogStore.getState().creditCards
        expect(cards.map((c) => c.id)).toEqual(['itau', 'nubank'])
        expect(cards.map((c) => c.order)).toEqual([0, 1])
      })
    })
  })
})
