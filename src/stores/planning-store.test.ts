import { del, get, keys, set } from 'idb-keyval'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Timestamp } from '@/domain/date'
import type { CardId, Goal, Installment } from '@/domain/entities'
import type { Uuid } from '@/domain/ids'
import type { Cents } from '@/domain/money'
import type { Month } from '@/domain/month'
import { PLANNING_STORAGE_KEY, usePlanningStore } from './planning-store'

describe('usePlanningStore', () => {
  beforeEach(async () => {
    usePlanningStore.setState({
      installments: [],
      goals: [],
    })
    const allKeys = await keys()
    for (const k of allKeys) {
      await del(k)
    }
  })

  it('initializes with empty installments and goals arrays', () => {
    const state = usePlanningStore.getState()
    expect(state.installments).toEqual([])
    expect(state.goals).toEqual([])
  })

  it('updates state via setState correctly and persists to IndexedDB', async () => {
    const sampleInstallment: Installment = {
      id: '33333333-3333-4333-8333-333333333333' as Uuid,
      name: 'Laptop',
      cardId: 'card-1' as CardId,
      totalInstallments: 10,
      amountPerInstallment: 50000 as Cents,
      startMonth: '2026-01' as Month,
    }

    const sampleGoal: Goal = {
      id: '44444444-4444-4444-8444-444444444444' as Uuid,
      name: 'Emergency Fund',
      icon: 'shield',
      // check-patterns-ignore-next-line
      color: '#00ffff',
      targetAmount: 1000000 as Cents,
      status: 'active',
      createdAt: '2026-08-05T14:30:00.000Z' as Timestamp,
    }

    usePlanningStore.setState({
      installments: [sampleInstallment],
      goals: [sampleGoal],
    })

    const state = usePlanningStore.getState()
    expect(state.installments).toEqual([sampleInstallment])
    expect(state.goals).toEqual([sampleGoal])

    // Wait briefly for async IndexedDB write
    await new Promise((resolve) => setTimeout(resolve, 50))

    const rawStored = await get(PLANNING_STORAGE_KEY)
    expect(rawStored).toBeDefined()
    const parsed = typeof rawStored === 'string' ? JSON.parse(rawStored) : rawStored
    expect(parsed.version).toBe(1)
    expect(parsed.state.goals).toEqual([sampleGoal])
  })

  it('rehydrates state from IndexedDB end-to-end', async () => {
    const sampleGoal: Goal = {
      id: '55555555-5555-4555-8555-555555555555' as Uuid,
      name: 'Vacation',
      icon: 'plane',
      // check-patterns-ignore-next-line
      color: '#ffff00',
      targetAmount: 500000 as Cents,
      status: 'active',
      createdAt: '2026-08-05T14:30:00.000Z' as Timestamp,
    }

    const payload = JSON.stringify({
      state: {
        installments: [],
        goals: [sampleGoal],
      },
      version: 1,
    })

    await set(PLANNING_STORAGE_KEY, payload)

    await usePlanningStore.persist.rehydrate()

    expect(usePlanningStore.getState().goals).toEqual([sampleGoal])
  })
})
