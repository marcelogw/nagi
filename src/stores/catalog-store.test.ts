import { del, get, keys, set } from 'idb-keyval'
import { beforeEach, describe, expect, it } from 'vitest'
import type { CardId, Category, CategoryId, CreditCard } from '@/domain/entities'
import type { Cents } from '@/domain/money'
import { CATALOG_STORAGE_KEY, useCatalogStore } from './catalog-store'

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
})
