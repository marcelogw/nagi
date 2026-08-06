import { describe, expect, it } from 'vitest'
import type { IsoDate, Timestamp } from '@/domain/date'
import type { CardId, CategoryId } from '@/domain/entities'
import type { Uuid } from '@/domain/ids'
import type { Cents } from '@/domain/money'
import type { Month } from '@/domain/month'
import { CATALOG_STORAGE_KEY, useCatalogStore } from '@/stores/catalog-store'
import { LEDGER_STORAGE_KEY, useLedgerStore } from '@/stores/ledger-store'
import { PLANNING_STORAGE_KEY, usePlanningStore } from '@/stores/planning-store'
import { indexedDbAdapter } from './db'
import { buildSnapshot, toJson } from './export'
import { commitSnapshot, parseSnapshot } from './import'

describe('persistence/import', () => {
  it('parseSnapshot parses valid JSON snapshot', () => {
    const validSnapshot = {
      version: 1,
      exportedAt: '2026-08-05T12:00:00.000Z',
      categories: [
        {
          id: 'other',
          // check-patterns-ignore-next-line: test fixture hex color
          color: '#808080',
          icon: 'folder',
          isSystem: true,
          order: 0,
        },
      ],
      creditCards: [],
      incomes: {},
      expenses: {},
      savingsEntries: {},
      recurrences: [],
      installments: [],
      goals: [],
    }

    const result = parseSnapshot(JSON.stringify(validSnapshot))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.snapshot).toEqual(validSnapshot)
    }
  })

  it('parseSnapshot returns error for malformed JSON', () => {
    const result = parseSnapshot('{ invalid json')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContain('Invalid JSON format')
    }
  })

  it('parseSnapshot returns error for non-object JSON values', () => {
    expect(parseSnapshot('123').ok).toBe(false)
    expect(parseSnapshot('null').ok).toBe(false)
    expect(parseSnapshot('"string"').ok).toBe(false)
    expect(parseSnapshot('[1, 2, 3]').ok).toBe(false)
  })

  it('parseSnapshot returns errors for missing or invalid top-level fields', () => {
    const validBase = {
      version: 1,
      exportedAt: '2026-08-05T12:00:00.000Z',
      categories: [],
      creditCards: [],
      incomes: {},
      expenses: {},
      savingsEntries: {},
      recurrences: [],
      installments: [],
      goals: [],
    }

    expect(parseSnapshot(JSON.stringify({ ...validBase, version: '1' })).ok).toBe(false)
    expect(parseSnapshot(JSON.stringify({ ...validBase, exportedAt: 123 })).ok).toBe(false)
    expect(parseSnapshot(JSON.stringify({ ...validBase, categories: 'invalid' })).ok).toBe(false)
    expect(parseSnapshot(JSON.stringify({ ...validBase, creditCards: 'invalid' })).ok).toBe(false)
    expect(parseSnapshot(JSON.stringify({ ...validBase, incomes: 'invalid' })).ok).toBe(false)
    expect(
      parseSnapshot(JSON.stringify({ ...validBase, incomes: { '2026-08': 'not-an-array' } })).ok,
    ).toBe(false)
    expect(parseSnapshot(JSON.stringify({ ...validBase, expenses: 'invalid' })).ok).toBe(false)
    expect(
      parseSnapshot(JSON.stringify({ ...validBase, expenses: { '2026-08': 'not-an-array' } })).ok,
    ).toBe(false)
    expect(parseSnapshot(JSON.stringify({ ...validBase, savingsEntries: 'invalid' })).ok).toBe(
      false,
    )
    expect(
      parseSnapshot(JSON.stringify({ ...validBase, savingsEntries: { '2026-08': 'not-an-array' } }))
        .ok,
    ).toBe(false)
    expect(parseSnapshot(JSON.stringify({ ...validBase, recurrences: 'invalid' })).ok).toBe(false)
    expect(parseSnapshot(JSON.stringify({ ...validBase, installments: 'invalid' })).ok).toBe(false)
    expect(parseSnapshot(JSON.stringify({ ...validBase, goals: 'invalid' })).ok).toBe(false)
  })

  it('commitSnapshot rejects snapshot with domain invariant violations without mutating stores', () => {
    // Set up initial store state
    const initialCatalog = {
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
    const initialLedger = {
      incomes: {},
      expenses: {},
      savingsEntries: {},
      recurrences: [],
    }
    const initialPlanning = {
      installments: [],
      goals: [],
    }

    useCatalogStore.setState(initialCatalog)
    useLedgerStore.setState(initialLedger)
    usePlanningStore.setState(initialPlanning)

    // Snapshot containing an expense with invalid categoryId 'non-existent'
    const invalidSnapshot = {
      version: 1,
      exportedAt: '2026-08-05T12:00:00.000Z',
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
      incomes: {},
      expenses: {
        '2026-08': [
          {
            id: 'exp-1' as Uuid,
            month: '2026-08' as Month,
            description: 'Invalid Expense',
            amount: 1000 as Cents,
            categoryId: 'non-existent' as CategoryId,
            kind: 'variable' as const,
            date: '2026-08-05' as IsoDate,
          },
        ],
      },
      savingsEntries: {},
      recurrences: [],
      installments: [],
      goals: [],
    }

    const result = commitSnapshot(invalidSnapshot, {
      setLedger: useLedgerStore.setState,
      setCatalog: useCatalogStore.setState,
      setPlanning: usePlanningStore.setState,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContain(
        'Expense exp-1: categoryId does not resolve to a category: non-existent',
      )
    }

    // Verify stores remain completely untouched. All three stores now carry
    // CRUD actions alongside their data, so a subset match against the plain
    // data fixtures, not a full equality check.
    expect(useLedgerStore.getState()).toMatchObject(initialLedger)
    expect(useCatalogStore.getState()).toMatchObject(initialCatalog)
    expect(usePlanningStore.getState()).toMatchObject(initialPlanning)
  })

  it('mandatory round-trip test: export -> wipe -> import -> deep-equal', async () => {
    // 1. Populate stores with non-trivial state (at least one entity of each type, including recurrence with exception)
    const initialCatalog = {
      categories: [
        {
          id: 'other' as CategoryId,
          // check-patterns-ignore-next-line: test fixture hex color
          color: '#808080',
          icon: 'folder',
          isSystem: true,
          order: 0,
        },
        {
          id: 'cat-food' as CategoryId,
          customLabel: 'Food',
          // check-patterns-ignore-next-line: test fixture hex color
          color: '#ff0000',
          icon: 'utensils',
          isSystem: false,
          order: 1,
        },
      ],
      creditCards: [
        {
          id: 'card-1' as CardId,
          name: 'Main Card',
          // check-patterns-ignore-next-line: test fixture hex color
          color: '#0000ff',
          limit: 500000 as Cents,
          order: 0,
        },
      ],
    }

    const initialPlanning = {
      installments: [
        {
          id: 'inst-1' as Uuid,
          name: 'Laptop',
          cardId: 'card-1' as CardId,
          totalInstallments: 12,
          amountPerInstallment: 30000 as Cents,
          startMonth: '2026-01' as Month,
        },
      ],
      goals: [
        {
          id: 'goal-1' as Uuid,
          name: 'Emergency Fund',
          icon: 'shield',
          // check-patterns-ignore-next-line: test fixture hex color
          color: '#00ff00',
          targetAmount: 1000000 as Cents,
          status: 'active' as const,
          createdAt: '2026-01-01T00:00:00.000Z' as Timestamp,
        },
      ],
    }

    const initialLedger = {
      incomes: {
        '2026-08': [
          {
            id: 'inc-1' as Uuid,
            month: '2026-08' as Month,
            description: 'Salary',
            amount: 300000 as Cents,
          },
        ],
      },
      expenses: {
        '2026-08': [
          {
            id: 'exp-1' as Uuid,
            month: '2026-08' as Month,
            description: 'Lunch',
            amount: 2500 as Cents,
            categoryId: 'cat-food' as CategoryId,
            kind: 'variable' as const,
            date: '2026-08-05' as IsoDate,
          },
        ],
      },
      savingsEntries: {
        '2026-08': [
          {
            id: 'sav-1' as Uuid,
            month: '2026-08' as Month,
            amount: 50000 as Cents,
            date: '2026-08-05' as IsoDate,
            confirmed: true,
            goalId: 'goal-1' as Uuid,
          },
        ],
      },
      recurrences: [
        {
          id: 'rec-1' as Uuid,
          kind: 'expense' as const,
          startMonth: '2026-01' as Month,
          endMonth: null,
          template: {
            description: 'Sub',
            amount: 1500 as Cents,
            categoryId: 'cat-food' as CategoryId,
          },
          exceptions: {
            '2026-05': { skip: true },
            '2026-06': { override: { amount: 2000 as Cents } },
          },
        },
      ],
    }

    useCatalogStore.setState(initialCatalog)
    usePlanningStore.setState(initialPlanning)
    useLedgerStore.setState(initialLedger)

    // 2. buildSnapshot -> toJson -> JSON.parse -> parseSnapshot
    const snapshotBeforeWipe = buildSnapshot({
      ledger: useLedgerStore.getState(),
      catalog: useCatalogStore.getState(),
      planning: usePlanningStore.getState(),
      now: () => 1700000000000,
    })

    const jsonString = toJson(snapshotBeforeWipe)
    const rawParsed = JSON.parse(jsonString)
    const parseResult = parseSnapshot(JSON.stringify(rawParsed))

    expect(parseResult.ok).toBe(true)
    if (!parseResult.ok) return

    // 3. Wipe all data in IDB and reset store states to empty
    await indexedDbAdapter.wipe([LEDGER_STORAGE_KEY, CATALOG_STORAGE_KEY, PLANNING_STORAGE_KEY])
    useLedgerStore.setState({ incomes: {}, expenses: {}, savingsEntries: {}, recurrences: [] })
    useCatalogStore.setState({ categories: [], creditCards: [] })
    usePlanningStore.setState({ installments: [], goals: [] })

    // Verify stores are now empty
    expect(useLedgerStore.getState().recurrences).toHaveLength(0)
    expect(useCatalogStore.getState().categories).toHaveLength(0)
    expect(usePlanningStore.getState().goals).toHaveLength(0)

    // 4. commitSnapshot with the real store setState functions
    const commitResult = commitSnapshot(parseResult.snapshot, {
      setLedger: useLedgerStore.setState,
      setCatalog: useCatalogStore.setState,
      setPlanning: usePlanningStore.setState,
    })

    expect(commitResult.ok).toBe(true)

    // 5. Compare state of the 3 stores AFTER import against state BEFORE wipe — must be deeply equal.
    // All three stores now carry CRUD actions alongside their data, so a
    // subset match against the plain data fixtures, not a full equality check.
    expect(useCatalogStore.getState()).toMatchObject(initialCatalog)
    expect(usePlanningStore.getState()).toMatchObject(initialPlanning)
    expect(useLedgerStore.getState()).toMatchObject(initialLedger)
  })
})
