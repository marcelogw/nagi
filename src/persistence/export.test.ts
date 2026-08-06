import { describe, expect, it } from 'vitest'
import type { CategoryId } from '@/domain/entities'
import { buildSnapshot, toJson } from './export'

describe('persistence/export', () => {
  const catalogState = {
    categories: [
      {
        id: 'other' as CategoryId,
        // check-patterns-ignore-next-line: test fixture hex color
        color: '#808080',
        icon: 'folder',
        isSystem: true,
        order: 0,
      },
    ],
    creditCards: [],
  }

  const ledgerState = {
    incomes: {},
    expenses: {},
    savingsEntries: {},
    recurrences: [],
  }

  const planningState = {
    installments: [],
    goals: [],
  }

  it('buildSnapshot constructs snapshot with version 1 and ISO timestamp', () => {
    const fixedNow = 1700000000000
    const snapshot = buildSnapshot({
      catalog: catalogState,
      ledger: ledgerState,
      planning: planningState,
      now: () => fixedNow,
    })

    expect(snapshot.version).toBe(1)
    expect(snapshot.exportedAt).toBe(new Date(fixedNow).toISOString())
    expect(snapshot.categories).toEqual(catalogState.categories)
    expect(snapshot.creditCards).toEqual(catalogState.creditCards)
    expect(snapshot.incomes).toEqual(ledgerState.incomes)
    expect(snapshot.expenses).toEqual(ledgerState.expenses)
    expect(snapshot.savingsEntries).toEqual(ledgerState.savingsEntries)
    expect(snapshot.recurrences).toEqual(ledgerState.recurrences)
    expect(snapshot.installments).toEqual(planningState.installments)
    expect(snapshot.goals).toEqual(planningState.goals)
  })

  it('toJson serializes snapshot into pretty-printed JSON', () => {
    const snapshot = buildSnapshot({
      catalog: catalogState,
      ledger: ledgerState,
      planning: planningState,
      now: () => 1700000000000,
    })

    const json = toJson(snapshot)
    expect(json).toBe(JSON.stringify(snapshot, null, 2))
    expect(JSON.parse(json)).toEqual(snapshot)
  })
})
