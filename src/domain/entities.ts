import type { Branded } from './brand'
import type { IsoDate, Timestamp } from './date'
import type { Uuid } from './ids'
import type { Cents } from './money'
import type { Month } from './month'

/**
 * The Phase 1 entity model — types only, no logic. Behaviour that acts on
 * these (recurrence expansion, installment scheduling, goal status) belongs
 * in the domain module that Phases 2-5 add when each feature area opens; this
 * file only owns the shape.
 *
 * `Note` is deliberately absent. `docs/decisions.md` ("Notes are out of 1.0")
 * is a decided product call and EPIC-008 (Phase 6 — Notes) is still backlog —
 * adding the type now would be speculative: no store field references it, no
 * UI renders it, nothing validates against it. Add it when EPIC-008 opens.
 */

// A category or card id is user-facing (for defaults, the id doubles as the
// i18n key) rather than a generated Uuid — branded so it cannot be swapped
// with a Uuid or a Month at a call site by accident.
export type CategoryId = Branded<string, 'CategoryId'>
export type CardId = Branded<string, 'CardId'>

/** No invariant governs colour format in Phase 1 — branding it would buy nothing. */
export type HexColor = string

/**
 * The one protected system category: cannot be renamed or deleted, and is the
 * reassignment target when any other category is deleted. `domain/invariants.ts`
 * checks every category list contains exactly one, with this id.
 */
export const SYSTEM_CATEGORY_ID = 'other' as CategoryId

export type Category = {
  id: CategoryId
  /** Present only for user-created categories. Absent means the label comes from `t('categories.' + id)` — see the dual-label rule in 03-domain-model.md. */
  customLabel?: string
  color: HexColor
  icon: string | null
  isSystem: boolean
  order: number
}

export type CreditCard = {
  id: CardId
  name: string
  color: HexColor
  /** `null` = no limit; `0` is a distinct, valid state — never conflate the two. */
  limit: Cents | null
  order: number
}

export type Income = {
  id: Uuid
  month: Month
  description: string
  amount: Cents
  /** Set when this row was expanded from a Recurrence rule. */
  recurrenceId?: Uuid
}

export type Expense = {
  id: Uuid
  month: Month
  description: string
  amount: Cents
  categoryId: CategoryId
  kind: 'fixed' | 'variable'
  date: IsoDate
  recurrenceId?: Uuid
}

export type RecurrenceTemplate = {
  description: string
  amount: Cents
  /** Expenses only. */
  categoryId?: CategoryId
}

/** A single-month deviation from a Recurrence's template, or an omission. */
export type RecurrenceException = { skip: true } | { override: Partial<RecurrenceTemplate> }

/**
 * A recurring income or expense rule — the fact stored once, with occurrences
 * derived per month rather than materialised as N rows. `exceptions` covers a
 * single month diverging from the rule (a price change, a skipped bill) or
 * being cancelled outright; Phase 1 does not build the UI to create one by
 * hand — that lands with Phase 3 (Ledger).
 */
export type Recurrence = {
  id: Uuid
  kind: 'income' | 'expense'
  startMonth: Month
  /** `null` = open-ended. */
  endMonth: Month | null
  template: RecurrenceTemplate
  exceptions: Record<Month, RecurrenceException>
}

/** `03-domain-model.md` invariant: `2 <= totalInstallments <= 48`. */
export const MIN_TOTAL_INSTALLMENTS = 2
export const MAX_TOTAL_INSTALLMENTS = 48

export type Installment = {
  id: Uuid
  name: string
  /** Required — never empty. An installment with no card is P-11 in the predecessor. */
  cardId: CardId
  totalInstallments: number
  amountPerInstallment: Cents
  startMonth: Month
}

/** Derived, never stored — present in month M when `0 <= monthDiff(startMonth, M) < totalInstallments`. */
export type InstallmentOccurrence = {
  installment: Installment
  /** 1-based. */
  number: number
  month: Month
}

export type SavingsEntry = {
  id: Uuid
  month: Month
  amount: Cents
  date: IsoDate
  source?: string
  note?: string
  goalId?: Uuid
  /** `false` = forecast, `true` = actually transferred. Goal progress counts only confirmed entries. */
  confirmed: boolean
}

export type Goal = {
  id: Uuid
  name: string
  icon: string
  color: HexColor
  targetAmount: Cents
  deadline?: Month
  status: 'active' | 'completed'
  /** Present iff `status === 'completed'` — enforced in `domain/invariants.ts`. */
  completedAt?: Timestamp
  createdAt: Timestamp
}
