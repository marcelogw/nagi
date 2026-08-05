import type {
  Category,
  CreditCard,
  Expense,
  Goal,
  Income,
  Installment,
  Recurrence,
  SavingsEntry,
} from './entities'
import { MAX_TOTAL_INSTALLMENTS, MIN_TOTAL_INSTALLMENTS, SYSTEM_CATEGORY_ID } from './entities'
import { isCents } from './money'
import { diffMonths, isMonth } from './month'

/**
 * The three Phase 1 stores' state, combined into the one shape both the JSON
 * importer and the Tempest importer validate against before committing
 * anything. `Note` has no field here — see the comment on its omission in
 * `entities.ts`.
 */
export type DomainState = {
  categories: Category[]
  creditCards: CreditCard[]
  incomes: Record<string, Income[]>
  expenses: Record<string, Expense[]>
  savingsEntries: Record<string, SavingsEntry[]>
  recurrences: Recurrence[]
  installments: Installment[]
  goals: Goal[]
}

export type Violation = {
  entity: string
  id: string
  reason: string
}

export type ValidationResult = { ok: true } | { ok: false; violations: Violation[] }

/**
 * Checks every invariant listed in `03-domain-model.md` against a full
 * Phase 1 state and returns *every* violation found, not just the first —
 * an import that fails needs to tell the user everything wrong with the
 * payload in one pass, not make them fix and retry ten times.
 *
 * Single validator for Phase 1 by design (confirmed with agy-tech-leader):
 * Phases 2-5 can delegate rule checks here to per-entity modules
 * (`domain/categories.ts`, `domain/recurrence.ts`, …) as those modules are
 * built — nothing about this shape blocks that, and splitting it now would
 * be delegating to files that don't exist yet.
 */
export function validate(state: DomainState): ValidationResult {
  const violations: Violation[] = []
  const report = (entity: string, id: string, reason: string) =>
    violations.push({ entity, id, reason })

  const categoryIds = new Set(state.categories.map((c) => c.id))
  const cardIds = new Set(state.creditCards.map((c) => c.id))
  const goalIds = new Set(state.goals.map((g) => g.id))

  // Invariant 1 — every Month key used anywhere is well-formed.
  const checkMonthKey = (entity: string, id: string, key: string) => {
    if (!isMonth(key)) report(entity, id, `not a well-formed month: ${key}`)
  }

  // Invariant 2 — every amount is a non-negative integer.
  const checkAmount = (entity: string, id: string, amount: unknown) => {
    if (!isCents(amount) || amount < 0) {
      report(entity, id, `amount is not a non-negative integer: ${String(amount)}`)
    }
  }

  for (const [key, rows] of Object.entries(state.incomes)) {
    checkMonthKey('Income', key, key)
    for (const income of rows) {
      checkAmount('Income', income.id, income.amount)
      checkMonthKey('Income', income.id, income.month)
    }
  }

  for (const [key, rows] of Object.entries(state.expenses)) {
    checkMonthKey('Expense', key, key)
    for (const expense of rows) {
      checkAmount('Expense', expense.id, expense.amount)
      checkMonthKey('Expense', expense.id, expense.month)
      // Invariant 3 — Expense.categoryId resolves to an existing category.
      if (!categoryIds.has(expense.categoryId)) {
        report(
          'Expense',
          expense.id,
          `categoryId does not resolve to a category: ${expense.categoryId}`,
        )
      }
    }
  }

  for (const [key, rows] of Object.entries(state.savingsEntries)) {
    checkMonthKey('SavingsEntry', key, key)
    for (const entry of rows) {
      checkAmount('SavingsEntry', entry.id, entry.amount)
      checkMonthKey('SavingsEntry', entry.id, entry.month)
      // Invariant 9 — SavingsEntry.goalId, when present, resolves to an existing goal.
      if (entry.goalId !== undefined && !goalIds.has(entry.goalId)) {
        report('SavingsEntry', entry.id, `goalId does not resolve to a goal: ${entry.goalId}`)
      }
    }
  }

  // Invariant 4 — exactly one category has isSystem: true, and its id is SYSTEM_CATEGORY_ID.
  const systemCategories = state.categories.filter((c) => c.isSystem)
  if (systemCategories.length !== 1) {
    report(
      'Category',
      '(system)',
      `expected exactly one system category, found ${systemCategories.length}`,
    )
  } else if (systemCategories[0]?.id !== SYSTEM_CATEGORY_ID) {
    report(
      'Category',
      systemCategories[0]?.id ?? '(system)',
      `system category id must be "${SYSTEM_CATEGORY_ID}"`,
    )
  }

  // Invariant 5 — order is contiguous from 0, per collection.
  const checkContiguousOrder = (entity: string, items: { id: string; order: number }[]) => {
    const orders = items.map((i) => i.order).toSorted((a, b) => a - b)
    orders.forEach((value, index) => {
      if (value !== index) {
        report(
          entity,
          items.find((i) => i.order === value)?.id ?? '(unknown)',
          `order is not contiguous from 0: got [${orders.join(', ')}]`,
        )
      }
    })
  }
  checkContiguousOrder('Category', state.categories)
  checkContiguousOrder('CreditCard', state.creditCards)

  for (const installment of state.installments) {
    // Invariant 6 — Installment.cardId resolves to an existing card.
    if (!cardIds.has(installment.cardId)) {
      report(
        'Installment',
        installment.id,
        `cardId does not resolve to a card: ${installment.cardId}`,
      )
    }
    // Invariant 7 — 2 <= totalInstallments <= 48, integer.
    const n = installment.totalInstallments
    if (!Number.isInteger(n) || n < MIN_TOTAL_INSTALLMENTS || n > MAX_TOTAL_INSTALLMENTS) {
      report(
        'Installment',
        installment.id,
        `totalInstallments out of range [${MIN_TOTAL_INSTALLMENTS}, ${MAX_TOTAL_INSTALLMENTS}]: ${n}`,
      )
    }
    checkAmount('Installment', installment.id, installment.amountPerInstallment)
    checkMonthKey('Installment', installment.id, installment.startMonth)
  }

  for (const recurrence of state.recurrences) {
    checkMonthKey('Recurrence', recurrence.id, recurrence.startMonth)
    checkAmount('Recurrence', recurrence.id, recurrence.template.amount)
    // Invariant 8 — a closed Recurrence has endMonth >= startMonth.
    if (recurrence.endMonth !== null) {
      checkMonthKey('Recurrence', recurrence.id, recurrence.endMonth)
      if (isMonth(recurrence.startMonth) && isMonth(recurrence.endMonth)) {
        if (diffMonths(recurrence.startMonth, recurrence.endMonth) < 0) {
          report(
            'Recurrence',
            recurrence.id,
            `endMonth (${recurrence.endMonth}) precedes startMonth (${recurrence.startMonth})`,
          )
        }
      }
    }
  }

  for (const card of state.creditCards) {
    if (card.limit !== null) checkAmount('CreditCard', card.id, card.limit)
  }

  for (const goal of state.goals) {
    checkAmount('Goal', goal.id, goal.targetAmount)
    // Invariant 10 — Goal.completedAt is present iff status === 'completed'.
    const hasCompletedAt = goal.completedAt !== undefined
    const isCompleted = goal.status === 'completed'
    if (hasCompletedAt !== isCompleted) {
      report(
        'Goal',
        goal.id,
        `completedAt must be present iff status is "completed" (status: ${goal.status}, completedAt: ${String(goal.completedAt)})`,
      )
    }
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations }
}
