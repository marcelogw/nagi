import { describe, expect, it } from 'vitest'
import type {
  Category,
  CategoryId,
  CardId,
  CreditCard,
  Expense,
  Goal,
  Installment,
  Recurrence,
  SavingsEntry,
} from './entities'
import { SYSTEM_CATEGORY_ID } from './entities'
import type { Cents } from './money'
import type { Month } from './month'
import type { IsoDate, Timestamp } from './date'
import type { Uuid } from './ids'
import { type DomainState, validate } from './invariants'

// Casts throughout: these are hand-built fixtures for a validator that exists
// specifically to catch data that never went through the domain's own
// parsers/guards (imported JSON, a hand-edited IndexedDB record) — the whole
// point is to construct values the compiler alone would not have allowed.
// HexColor carries no format invariant in Phase 1 (nothing in 03-domain-model
// checks it), so fixtures use a plain placeholder rather than a real hex
// value — `no-hardcoded-colour` applies to every src/**/*.ts file, tests
// included.
const month = (value: string) => value as Month
const cents = (value: number) => value as Cents
const uuid = (value: string) => value as Uuid
const timestamp = (value: string) => value as Timestamp
const PLACEHOLDER_COLOR = 'brand-ink'

const otherCategory: Category = {
  id: SYSTEM_CATEGORY_ID,
  color: PLACEHOLDER_COLOR,
  icon: null,
  isSystem: true,
  order: 0,
}

const groceriesCategory: Category = {
  id: 'groceries' as CategoryId,
  color: PLACEHOLDER_COLOR,
  icon: 'shopping-cart',
  isSystem: false,
  order: 1,
}

const card: CreditCard = {
  id: 'nubank' as CardId,
  name: 'Nubank',
  color: PLACEHOLDER_COLOR,
  limit: cents(500000),
  order: 0,
}

function emptyState(): DomainState {
  return {
    categories: [otherCategory],
    creditCards: [],
    incomes: {},
    expenses: {},
    savingsEntries: {},
    recurrences: [],
    installments: [],
    goals: [],
  }
}

describe('validate — a well-formed empty state', () => {
  it('holds, since every invariant is vacuously satisfied except the system category', () => {
    expect(validate(emptyState())).toEqual({ ok: true })
  })
})

describe('invariant 1 — every Month key is well-formed', () => {
  it('rejects a malformed month key on the ledger record', () => {
    const state = emptyState()
    state.incomes = {
      [month('banana')]: [
        { id: uuid('i1'), month: month('banana'), description: 'x', amount: cents(100) },
      ],
    }

    const result = validate(state)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.violations.some((v) => v.reason.includes('month'))).toBe(true)
  })
})

describe('invariant 2 — amounts are non-negative integers', () => {
  it('rejects a negative income amount', () => {
    const state = emptyState()
    const m = month('2026-07')
    state.incomes = {
      [m]: [{ id: uuid('i1'), month: m, description: 'x', amount: cents(-100) }],
    }

    const result = validate(state)

    expect(result.ok).toBe(false)
  })
})

describe('invariant 3 — Expense.categoryId resolves to an existing category', () => {
  it('rejects an expense filed under an unknown category', () => {
    const state = emptyState()
    const m = month('2026-07')
    const expense: Expense = {
      id: uuid('e1'),
      month: m,
      description: 'x',
      amount: cents(100),
      categoryId: 'ghost' as CategoryId,
      kind: 'variable',
      date: '2026-07-01' as IsoDate,
    }
    state.expenses = { [m]: [expense] }

    expect(validate(state).ok).toBe(false)
  })

  it('accepts an expense filed under a category that exists', () => {
    const state = emptyState()
    state.categories.push(groceriesCategory)
    const m = month('2026-07')
    const expense: Expense = {
      id: uuid('e1'),
      month: m,
      description: 'x',
      amount: cents(100),
      categoryId: groceriesCategory.id,
      kind: 'variable',
      date: '2026-07-01' as IsoDate,
    }
    state.expenses = { [m]: [expense] }

    expect(validate(state)).toEqual({ ok: true })
  })
})

describe('invariant 4 — exactly one system category, id "other"', () => {
  it('rejects a state with no system category', () => {
    const state = emptyState()
    state.categories = [groceriesCategory]

    expect(validate(state).ok).toBe(false)
  })

  it('rejects a state with two system categories', () => {
    const state = emptyState()
    state.categories = [otherCategory, { ...groceriesCategory, isSystem: true }]

    expect(validate(state).ok).toBe(false)
  })

  it('rejects a system category whose id is not "other"', () => {
    const state = emptyState()
    state.categories = [{ ...otherCategory, id: 'weird' as CategoryId }]

    expect(validate(state).ok).toBe(false)
  })
})

describe('invariant 5 — order is contiguous from 0', () => {
  it('rejects a category order gap', () => {
    const state = emptyState()
    state.categories.push({ ...groceriesCategory, order: 5 })

    expect(validate(state).ok).toBe(false)
  })

  it('rejects a duplicate card order', () => {
    const state = emptyState()
    state.creditCards = [card, { ...card, id: 'itau' as CardId, order: 0 }]

    expect(validate(state).ok).toBe(false)
  })

  it('accepts contiguous card orders', () => {
    const state = emptyState()
    state.creditCards = [card, { ...card, id: 'itau' as CardId, order: 1 }]

    expect(validate(state)).toEqual({ ok: true })
  })
})

describe('invariant 6 — Installment.cardId resolves to an existing card', () => {
  it('rejects an installment against a card that does not exist', () => {
    const state = emptyState()
    const installment: Installment = {
      id: uuid('p1'),
      name: 'Sofa',
      cardId: 'ghost' as CardId,
      totalInstallments: 10,
      amountPerInstallment: cents(5000),
      startMonth: month('2026-07'),
    }
    state.installments = [installment]

    expect(validate(state).ok).toBe(false)
  })
})

describe('invariant 7 — totalInstallments is between 2 and 48', () => {
  it.each([1, 0, -1, 49, 1.5])('rejects %i', (totalInstallments) => {
    const state = emptyState()
    state.creditCards = [card]
    state.installments = [
      {
        id: uuid('p1'),
        name: 'Sofa',
        cardId: card.id,
        totalInstallments,
        amountPerInstallment: cents(5000),
        startMonth: month('2026-07'),
      },
    ]

    expect(validate(state).ok).toBe(false)
  })

  it.each([2, 48, 12])('accepts %i', (totalInstallments) => {
    const state = emptyState()
    state.creditCards = [card]
    state.installments = [
      {
        id: uuid('p1'),
        name: 'Sofa',
        cardId: card.id,
        totalInstallments,
        amountPerInstallment: cents(5000),
        startMonth: month('2026-07'),
      },
    ]

    expect(validate(state)).toEqual({ ok: true })
  })
})

describe('invariant 8 — a closed Recurrence has endMonth >= startMonth', () => {
  it('rejects an endMonth before startMonth', () => {
    const state = emptyState()
    const recurrence: Recurrence = {
      id: uuid('r1'),
      kind: 'income',
      startMonth: month('2026-07'),
      endMonth: month('2026-06'),
      template: { description: 'Salary', amount: cents(100000) },
      exceptions: {},
    }
    state.recurrences = [recurrence]

    expect(validate(state).ok).toBe(false)
  })

  it('accepts an open-ended recurrence (endMonth null)', () => {
    const state = emptyState()
    const recurrence: Recurrence = {
      id: uuid('r1'),
      kind: 'income',
      startMonth: month('2026-07'),
      endMonth: null,
      template: { description: 'Salary', amount: cents(100000) },
      exceptions: {},
    }
    state.recurrences = [recurrence]

    expect(validate(state)).toEqual({ ok: true })
  })
})

describe('invariant 9 — SavingsEntry.goalId, when present, resolves to an existing goal', () => {
  it('rejects a savings entry pointing at an unknown goal', () => {
    const state = emptyState()
    const m = month('2026-07')
    const entry: SavingsEntry = {
      id: uuid('s1'),
      month: m,
      amount: cents(100),
      date: '2026-07-01' as IsoDate,
      confirmed: true,
      goalId: uuid('ghost'),
    }
    state.savingsEntries = { [m]: [entry] }

    expect(validate(state).ok).toBe(false)
  })
})

describe('invariant 10 — Goal.completedAt is present iff status is completed', () => {
  it('rejects a completed goal with no completedAt', () => {
    const state = emptyState()
    const goal: Goal = {
      id: uuid('g1'),
      name: 'Trip',
      icon: 'plane',
      color: PLACEHOLDER_COLOR,
      targetAmount: cents(100000),
      status: 'completed',
      createdAt: timestamp('2026-01-01T00:00:00.000Z'),
    }
    state.goals = [goal]

    expect(validate(state).ok).toBe(false)
  })

  it('rejects an active goal that carries a completedAt', () => {
    const state = emptyState()
    const goal: Goal = {
      id: uuid('g1'),
      name: 'Trip',
      icon: 'plane',
      color: PLACEHOLDER_COLOR,
      targetAmount: cents(100000),
      status: 'active',
      completedAt: timestamp('2026-01-01T00:00:00.000Z'),
      createdAt: timestamp('2026-01-01T00:00:00.000Z'),
    }
    state.goals = [goal]

    expect(validate(state).ok).toBe(false)
  })

  it('accepts a completed goal with completedAt set', () => {
    const state = emptyState()
    const goal: Goal = {
      id: uuid('g1'),
      name: 'Trip',
      icon: 'plane',
      color: PLACEHOLDER_COLOR,
      targetAmount: cents(100000),
      status: 'completed',
      completedAt: timestamp('2026-01-01T00:00:00.000Z'),
      createdAt: timestamp('2026-01-01T00:00:00.000Z'),
    }
    state.goals = [goal]

    expect(validate(state)).toEqual({ ok: true })
  })
})

describe('multiple violations', () => {
  it('reports every violation found, not just the first', () => {
    const state = emptyState()
    state.categories = [] // violates invariant 4
    state.creditCards = [card, { ...card, id: 'itau' as CardId, order: 5 }] // violates 5

    const result = validate(state)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.violations.length).toBeGreaterThanOrEqual(2)
  })
})
