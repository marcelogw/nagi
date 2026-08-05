import { describe, expect, it } from 'vitest'
import { SYSTEM_CATEGORY_ID } from './entities'
import { validate } from './invariants'
import type { Cents } from './money'

import { importTempestExport, type TempestExportV3 } from './tempest-import'

describe('importTempestExport', () => {
  it('returns an error when raw payload is not an object', () => {
    expect(importTempestExport(null)).toEqual({
      ok: false,
      errors: ['Invalid export payload: raw must be a non-null object'],
    })
    expect(importTempestExport(123)).toEqual({
      ok: false,
      errors: ['Invalid export payload: raw must be a non-null object'],
    })
    expect(importTempestExport('invalid')).toEqual({
      ok: false,
      errors: ['Invalid export payload: raw must be a non-null object'],
    })
  })

  it('mandatory fixture 1: reconstructs a recurrence with tail value edit over 6 months', () => {
    const raw: TempestExportV3 = {
      state: {
        monthlyData: {
          '2026-01': {
            incomes: [
              {
                id: 'inc-1',
                month: '2026-01',
                description: 'Salary',
                amount: 100,
                recurringGroupId: 'grp-salary',
              },
            ],
            fixedExpenses: [],
            variableExpenses: [],
            savingsEntries: [],
          },
          '2026-02': {
            incomes: [
              {
                id: 'inc-2',
                month: '2026-02',
                description: 'Salary',
                amount: 100,
                recurringGroupId: 'grp-salary',
              },
            ],
            fixedExpenses: [],
            variableExpenses: [],
            savingsEntries: [],
          },
          '2026-03': {
            incomes: [
              {
                id: 'inc-3',
                month: '2026-03',
                description: 'Salary',
                amount: 100,
                recurringGroupId: 'grp-salary',
              },
            ],
            fixedExpenses: [],
            variableExpenses: [],
            savingsEntries: [],
          },
          '2026-04': {
            incomes: [
              {
                id: 'inc-4',
                month: '2026-04',
                description: 'Salary',
                amount: 120,
                recurringGroupId: 'grp-salary',
              },
            ],
            fixedExpenses: [],
            variableExpenses: [],
            savingsEntries: [],
          },
          '2026-05': {
            incomes: [
              {
                id: 'inc-5',
                month: '2026-05',
                description: 'Salary',
                amount: 120,
                recurringGroupId: 'grp-salary',
              },
            ],
            fixedExpenses: [],
            variableExpenses: [],
            savingsEntries: [],
          },
          '2026-06': {
            incomes: [
              {
                id: 'inc-6',
                month: '2026-06',
                description: 'Salary',
                amount: 120,
                recurringGroupId: 'grp-salary',
              },
            ],
            fixedExpenses: [],
            variableExpenses: [],
            savingsEntries: [],
          },
        },
      },
    }

    const result = importTempestExport(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const { snapshot } = result
    expect(snapshot.recurrences).toHaveLength(1)
    const rec = snapshot.recurrences[0]
    expect(rec).toBeDefined()
    if (!rec) return
    expect(rec.kind).toBe('income')
    expect(rec.startMonth).toBe('2026-01')
    expect(rec.endMonth).toBe('2026-06')
    expect(rec.template).toEqual({
      description: 'Salary',
      amount: 10000 as Cents,
    })
    expect(rec.exceptions).toEqual({
      '2026-04': { override: { description: 'Salary', amount: 12000 as Cents } },
      '2026-05': { override: { description: 'Salary', amount: 12000 as Cents } },
      '2026-06': { override: { description: 'Salary', amount: 12000 as Cents } },
    })

    // Grouped rows are absorbed, not emitted in loose incomes
    expect(snapshot.incomes['2026-01']).toEqual([])
    expect(snapshot.incomes['2026-04']).toEqual([])

    // Verify snapshot satisfies invariants
    expect(validate(snapshot)).toEqual({ ok: true })
  })

  it('mandatory fixture 2: reconstructs a recurrence with a missing month (gap -> skip)', () => {
    const raw: TempestExportV3 = {
      state: {
        monthlyData: {
          '2026-01': {
            incomes: [],
            fixedExpenses: [
              {
                id: 'exp-1',
                month: '2026-01',
                description: 'Rent',
                amount: 500,
                category: 'housing',
                recurringGroupId: 'grp-rent',
              },
            ],
            variableExpenses: [],
            savingsEntries: [],
          },
          '2026-02': {
            incomes: [],
            fixedExpenses: [
              {
                id: 'exp-2',
                month: '2026-02',
                description: 'Rent',
                amount: 500,
                category: 'housing',
                recurringGroupId: 'grp-rent',
              },
            ],
            variableExpenses: [],
            savingsEntries: [],
          },
          // 2026-03 missing
          '2026-04': {
            incomes: [],
            fixedExpenses: [
              {
                id: 'exp-4',
                month: '2026-04',
                description: 'Rent',
                amount: 500,
                category: 'housing',
                recurringGroupId: 'grp-rent',
              },
            ],
            variableExpenses: [],
            savingsEntries: [],
          },
        },
        categories: [
          // check-patterns-ignore-next-line: test fixture hex color
          { id: 'housing', color: '#123456', icon: 'home', isSystem: false, order: 0 },
        ],
      },
    }

    const result = importTempestExport(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const rec = result.snapshot.recurrences[0]
    expect(rec).toBeDefined()
    if (!rec) return
    expect(rec.kind).toBe('expense')
    expect(rec.startMonth).toBe('2026-01')
    expect(rec.endMonth).toBe('2026-04')
    expect(rec.exceptions).toEqual({
      '2026-03': { skip: true },
    })
  })

  it('mandatory fixture 3: reconstructs a recurrence with zero exceptions', () => {
    const raw: TempestExportV3 = {
      state: {
        monthlyData: {
          '2026-01': {
            incomes: [],
            fixedExpenses: [
              {
                id: 'exp-1',
                month: '2026-01',
                description: 'Internet',
                amount: 50,
                category: 'bills',
                recurringGroupId: 'grp-net',
              },
            ],
            variableExpenses: [],
            savingsEntries: [],
          },
          '2026-02': {
            incomes: [],
            fixedExpenses: [
              {
                id: 'exp-2',
                month: '2026-02',
                description: 'Internet',
                amount: 50,
                category: 'bills',
                recurringGroupId: 'grp-net',
              },
            ],
            variableExpenses: [],
            savingsEntries: [],
          },
        },
      },
    }

    const result = importTempestExport(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const rec = result.snapshot.recurrences[0]
    expect(rec).toBeDefined()
    if (!rec) return
    expect(rec.exceptions).toEqual({})
  })

  it('reconstructs expense recurrence with category override when category changes', () => {
    const raw: TempestExportV3 = {
      state: {
        monthlyData: {
          '2026-01': {
            fixedExpenses: [
              {
                month: '2026-01',
                description: 'Subscription',
                amount: 10,
                category: 'c1',
                recurringGroupId: 'grp-sub',
              },
            ],
          },
          '2026-02': {
            fixedExpenses: [
              {
                month: '2026-02',
                description: 'Subscription',
                amount: 10,
                category: 'c2',
                recurringGroupId: 'grp-sub',
              },
            ],
          },
        },
        categories: [
          // check-patterns-ignore-next-line: test fixture hex color
          { id: 'c1', color: '#111111', isSystem: false, order: 0 },
          // check-patterns-ignore-next-line: test fixture hex color
          { id: 'c2', color: '#222222', isSystem: false, order: 1 },
        ],
      },
    }

    const result = importTempestExport(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const rec = result.snapshot.recurrences[0]
    expect(rec).toBeDefined()
    if (!rec) return
    expect(rec.exceptions).toEqual({
      '2026-02': {
        override: {
          description: 'Subscription',
          amount: 1000 as Cents,
          categoryId: 'c2',
        },
      },
    })
  })

  it('correctly separates loose items from recurring items and maps all entities', () => {
    const raw: TempestExportV3 = {
      state: {
        monthlyData: {
          '2026-01': {
            incomes: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                month: '2026-01',
                description: 'Bonus',
                amount: 250.5,
              },
            ],
            fixedExpenses: [
              {
                id: '22222222-2222-4222-8222-222222222222',
                month: '2026-01',
                description: 'Insurance',
                amount: 100.25,
                category: 'finance',
                date: '2026-01-10',
              },
            ],
            variableExpenses: [
              {
                id: '33333333-3333-4333-8333-333333333333',
                month: '2026-01',
                description: 'Groceries',
                amount: 75,
                category: 'food',
                date: '2026-01-15',
              },
            ],
            savingsEntries: [
              {
                id: '44444444-4444-4444-8444-444444444444',
                month: '2026-01',
                amount: 300,
                date: '2026-01-20',
                confirmed: true,
                goalId: '66666666-6666-4666-8666-666666666666',
              },
            ],
          },
        },
        installments: [
          {
            id: '55555555-5555-4555-8555-555555555555',
            name: 'Laptop',
            card: 'card-1',
            totalInstallments: 10,
            amountPerInstallment: 150,
            startMonth: '2026-01',
          },
        ],
        categories: [
          // check-patterns-ignore-next-line: test fixture hex color
          { id: 'finance', color: '#ff0000', icon: 'bank', isSystem: false, order: 0 },
          // check-patterns-ignore-next-line: test fixture hex color
          { id: 'food', color: '#00ff00', icon: 'utensils', isSystem: false, order: 1 },
        ],
        creditCards: [
          // check-patterns-ignore-next-line: test fixture hex color
          { id: 'card-1', name: 'Visa', color: '#0000ff', limit: 2000, order: 0 },
          // check-patterns-ignore-next-line: test fixture hex color
          { id: 'card-2', name: 'Mastercard', color: '#ffff00', limit: null, order: 1 },
        ],
        goals: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            name: 'Emergency Fund',
            icon: 'shield',
            // check-patterns-ignore-next-line: test fixture hex color
            color: '#00ffff',
            targetAmount: 5000,
            status: 'completed',
            completedAt: '2026-01-01T10:00:00.000Z',
            createdAt: '2025-01-01T10:00:00.000Z',
          },
        ],
        notes: ['Ignored note'],
      },
    }

    const result = importTempestExport(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const { snapshot } = result

    // Incomes
    expect(snapshot.incomes['2026-01']).toEqual([
      {
        id: '11111111-1111-4111-8111-111111111111',
        month: '2026-01',
        description: 'Bonus',
        amount: 25050 as Cents,
      },
    ])

    // Expenses
    expect(snapshot.expenses['2026-01']).toEqual([
      {
        id: '22222222-2222-4222-8222-222222222222',
        month: '2026-01',
        description: 'Insurance',
        amount: 10025 as Cents,
        categoryId: 'finance',
        kind: 'fixed',
        date: '2026-01-10',
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        month: '2026-01',
        description: 'Groceries',
        amount: 7500 as Cents,
        categoryId: 'food',
        kind: 'variable',
        date: '2026-01-15',
      },
    ])

    // Savings
    expect(snapshot.savingsEntries['2026-01']).toEqual([
      {
        id: '44444444-4444-4444-8444-444444444444',
        month: '2026-01',
        amount: 30000 as Cents,
        date: '2026-01-20',
        confirmed: true,
        goalId: '66666666-6666-4666-8666-666666666666',
      },
    ])

    // Installments
    expect(snapshot.installments).toEqual([
      {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Laptop',
        cardId: 'card-1',
        totalInstallments: 10,
        amountPerInstallment: 15000 as Cents,
        startMonth: '2026-01',
      },
    ])

    // Categories (ensures SYSTEM_CATEGORY_ID is added with contiguous order)
    expect(snapshot.categories).toHaveLength(3)
    const systemCat = snapshot.categories.find((c) => c.id === SYSTEM_CATEGORY_ID)
    expect(systemCat).toBeDefined()
    expect(systemCat?.isSystem).toBe(true)

    // Credit Cards
    expect(snapshot.creditCards).toEqual([
      // check-patterns-ignore-next-line: test fixture hex color
      { id: 'card-1', name: 'Visa', color: '#0000ff', limit: 200000 as Cents, order: 0 },
      // check-patterns-ignore-next-line: test fixture hex color
      { id: 'card-2', name: 'Mastercard', color: '#ffff00', limit: null, order: 1 },
    ])

    // Goals
    expect(snapshot.goals[0]?.name).toBe('Emergency Fund')
    expect(snapshot.goals[0]?.targetAmount).toBe(500000 as Cents)
    expect(snapshot.goals[0]?.status).toBe('completed')
    expect(snapshot.goals[0]?.completedAt).toBe('2026-01-01T10:00:00.000Z')

    // Invariants check
    expect(validate(snapshot)).toEqual({ ok: true })
  })

  it('validates form errors and returns error messages without throwing', () => {
    const rawWithBadMonth = {
      state: {
        monthlyData: {
          'invalid-month': {
            incomes: [
              {
                month: 'invalid-month',
                description: 'Test',
                amount: 100,
              },
            ],
          },
        },
      },
    }

    const res1 = importTempestExport(rawWithBadMonth)
    expect(res1.ok).toBe(false)
    if (!res1.ok) {
      expect(res1.errors.length).toBeGreaterThan(0)
    }

    const rawWithMissingFields = {
      state: {
        monthlyData: {
          '2026-01': {
            incomes: [
              {
                // missing description and amount
                month: '2026-01',
              },
            ],
          },
        },
      },
    }

    const res2 = importTempestExport(rawWithMissingFields)
    expect(res2.ok).toBe(false)
    if (!res2.ok) {
      expect(res2.errors.length).toBeGreaterThan(0)
    }
  })

  it('handles invalid array / object structures cleanly', () => {
    const rawInvalidStructures = {
      monthlyData: {
        '2026-01': 'not-an-object',
      },
    }
    const res1 = importTempestExport(rawInvalidStructures)
    expect(res1.ok).toBe(false)

    const rawInvalidArrays = {
      monthlyData: {
        '2026-01': {
          incomes: 'not-an-array',
          fixedExpenses: 'not-an-array',
          variableExpenses: 'not-an-array',
          savingsEntries: 'not-an-array',
        },
      },
      installments: 'not-an-array',
      categories: 'not-an-array',
      creditCards: 'not-an-array',
      goals: 'not-an-array',
    }
    const res2 = importTempestExport(rawInvalidArrays)
    expect(res2.ok).toBe(false)
    if (!res2.ok) {
      expect(res2.errors).toContain('monthlyData["2026-01"].incomes must be an array')
      expect(res2.errors).toContain('monthlyData["2026-01"].fixedExpenses must be an array')
      expect(res2.errors).toContain('monthlyData["2026-01"].variableExpenses must be an array')
      expect(res2.errors).toContain('monthlyData["2026-01"].savingsEntries must be an array')
      expect(res2.errors).toContain('installments must be an array')
      expect(res2.errors).toContain('categories must be an array')
      expect(res2.errors).toContain('creditCards must be an array')
      expect(res2.errors).toContain('goals must be an array')
    }
  })

  it('handles invalid element shapes in collections', () => {
    const rawBadElements = {
      installments: ['not-an-object'],
      categories: ['not-an-object'],
      creditCards: ['not-an-object'],
      goals: ['not-an-object'],
    }
    const res = importTempestExport(rawBadElements)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.errors).toContain('installments[0]: must be an object')
      expect(res.errors).toContain('categories[0]: missing or invalid required fields (id)')
      expect(res.errors).toContain('creditCards[0]: missing or invalid required fields (id, name)')
      expect(res.errors).toContain('goals[0]: must be an object')
    }
  })

  it('falls back to default values for optional/missing values in valid imports', () => {
    const raw = {
      monthlyData: {
        '2026-01': {
          fixedExpenses: [
            {
              month: '2026-01',
              description: 'Expense without date or category',
              amount: 50,
            },
          ],
          savingsEntries: [
            {
              month: '2026-01',
              amount: 100,
            },
          ],
        },
      },
      goals: [
        {
          name: 'Completed Goal without completedAt',
          targetAmount: 1000,
          status: 'completed',
        },
      ],
    }

    const res = importTempestExport(raw)
    expect(res.ok).toBe(true)
    if (!res.ok) return

    const { snapshot } = res
    const exp = snapshot.expenses['2026-01']?.[0]
    expect(exp?.categoryId).toBe(SYSTEM_CATEGORY_ID)
    expect(exp?.date).toBe('2026-01-01')

    const sav = snapshot.savingsEntries['2026-01']?.[0]
    expect(sav?.date).toBe('2026-01-01')
    expect(sav?.confirmed).toBe(true)

    const goal = snapshot.goals[0]
    expect(goal?.status).toBe('completed')
    expect(goal?.completedAt).toBeDefined()

    expect(validate(snapshot)).toEqual({ ok: true })
  })

  it('handles invalid monthlyData top-level property', () => {
    const raw = {
      monthlyData: 'not-an-object',
    }
    const res = importTempestExport(raw)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.errors).toContain('monthlyData must be an object')
    }
  })
})
