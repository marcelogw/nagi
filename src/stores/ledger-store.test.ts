import { del, get, keys, set } from 'idb-keyval'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Income } from '@/domain/entities'
import type { Uuid } from '@/domain/ids'
import type { Cents } from '@/domain/money'
import type { Month } from '@/domain/month'
import { LEDGER_STORAGE_KEY, useLedgerStore } from './ledger-store'

describe('useLedgerStore', () => {
  beforeEach(async () => {
    // Reset store state
    useLedgerStore.setState({
      incomes: {},
      expenses: {},
      savingsEntries: {},
      recurrences: [],
    })
    // Clear IndexedDB keys
    const allKeys = await keys()
    for (const k of allKeys) {
      await del(k)
    }
  })

  it('initializes with empty records and empty recurrences array without pre-populating months', () => {
    const state = useLedgerStore.getState()
    expect(state.incomes).toEqual({})
    expect(state.expenses).toEqual({})
    expect(state.savingsEntries).toEqual({})
    expect(state.recurrences).toEqual([])

    expect(Object.keys(state.incomes)).toHaveLength(0)
    expect(Object.keys(state.expenses)).toHaveLength(0)
    expect(Object.keys(state.savingsEntries)).toHaveLength(0)
  })

  it('updates state via setState correctly and persists to IndexedDB', async () => {
    const sampleIncome: Income = {
      id: '11111111-1111-4111-8111-111111111111' as Uuid,
      month: '2026-08' as Month,
      description: 'Salary',
      amount: 500000 as Cents,
    }

    useLedgerStore.setState({
      incomes: {
        ['2026-08' as Month]: [sampleIncome],
      },
    })

    const state = useLedgerStore.getState()
    expect(state.incomes['2026-08' as Month]).toEqual([sampleIncome])

    // Wait briefly for async IndexedDB write
    await new Promise((resolve) => setTimeout(resolve, 50))

    const rawStored = await get(LEDGER_STORAGE_KEY)
    expect(rawStored).toBeDefined()
    const parsed = typeof rawStored === 'string' ? JSON.parse(rawStored) : rawStored
    expect(parsed.version).toBe(1)
    expect(parsed.state.incomes['2026-08']).toEqual([sampleIncome])
  })

  it('rehydrates state from IndexedDB end-to-end', async () => {
    const sampleIncome: Income = {
      id: '22222222-2222-4222-8222-222222222222' as Uuid,
      month: '2026-09' as Month,
      description: 'Freelance',
      amount: 150000 as Cents,
    }

    const payload = JSON.stringify({
      state: {
        incomes: {
          '2026-09': [sampleIncome],
        },
        expenses: {},
        savingsEntries: {},
        recurrences: [],
      },
      version: 1,
    })

    await set(LEDGER_STORAGE_KEY, payload)

    await useLedgerStore.persist.rehydrate()

    expect(useLedgerStore.getState().incomes['2026-09' as Month]).toEqual([sampleIncome])
  })
})
