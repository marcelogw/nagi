import type { Category, CategoryId, Expense, Recurrence, RecurrenceException } from './entities'
import { SYSTEM_CATEGORY_ID } from './entities'
import type { Month } from './month'

export class InvalidCategoryIdError extends Error {
  readonly sourceName: string

  constructor(sourceName: string) {
    super(`Category name normalises to an empty id: "${sourceName}"`)
    this.name = 'InvalidCategoryIdError'
    this.sourceName = sourceName
  }
}

export class DuplicateCategoryIdError extends Error {
  readonly id: CategoryId

  constructor(id: CategoryId) {
    super(`Category id already exists: "${id}"`)
    this.name = 'DuplicateCategoryIdError'
    this.id = id
  }
}

export class ProtectedCategoryError extends Error {
  readonly id: CategoryId

  constructor(id: CategoryId) {
    super(`The system category cannot be renamed or deleted: "${id}"`)
    this.name = 'ProtectedCategoryError'
    this.id = id
  }
}

export class CategoryNotFoundError extends Error {
  readonly id: CategoryId

  constructor(id: CategoryId) {
    super(`Category not found: "${id}"`)
    this.name = 'CategoryNotFoundError'
    this.id = id
  }
}

/** Returns `category`, or throws CategoryNotFoundError. */
export function requireCategory(categories: readonly Category[], id: CategoryId): Category {
  const category = categories.find((c) => c.id === id)
  if (!category) throw new CategoryNotFoundError(id)
  return category
}

const DIACRITICS_PATTERN = /[\u0300-\u036f]/g
const NON_ALPHANUMERIC_RUN_PATTERN = /[^a-z0-9]+/g
const EDGE_HYPHENS_PATTERN = /^-+|-+$/g

/**
 * Derives a CategoryId from a user-typed name. A name with no latin letters or
 * digits (e.g. an emoji) normalises to an empty id, which is rejected rather
 * than silently stored — P-12.
 */
export function normalizeCategoryId(name: string): CategoryId {
  const id = name
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_RUN_PATTERN, '-')
    .replace(EDGE_HYPHENS_PATTERN, '')

  if (id === '') {
    throw new InvalidCategoryIdError(name)
  }

  return id as CategoryId
}

const DEFAULT_CATEGORY_COLOR_CYCLE = [
  'oklch(0.64 0.10 168)',
  'oklch(0.62 0.10 250)',
  'oklch(0.62 0.11 285)',
  'oklch(0.64 0.10 210)',
  'oklch(0.64 0.11 25)',
  'oklch(0.63 0.10 95)',
  'oklch(0.62 0.11 300)',
  'oklch(0.63 0.11 350)',
]

/**
 * The 11 categories every fresh install ships with, plus the protected system
 * category (`SYSTEM_CATEGORY_ID`, seeded separately at order 0 by the store).
 * No `name`/label field: a default's display name is never stored, it is
 * always resolved at render time by translating the id — see the dual-label
 * rule on `Category.customLabel`. Ids are the canonical English term per the glossary;
 * colours cycle through the curated 8-swatch palette the colour picker offers.
 */
const DEFAULT_CATEGORY_SEEDS: readonly [id: string, icon: string][] = [
  ['housing', 'house'],
  ['utilities', 'plug-zap'],
  ['education', 'graduation-cap'],
  ['subscriptions', 'credit-card'],
  ['groceries', 'shopping-cart'],
  ['food', 'utensils'],
  ['transport', 'car'],
  ['health', 'heart-pulse'],
  ['leisure', 'film'],
  ['electronics', 'wifi'],
  ['courses', 'book-open'],
]

export const DEFAULT_CATEGORIES: readonly Category[] = DEFAULT_CATEGORY_SEEDS.map(
  ([id, icon], index) => ({
    id: id as CategoryId,
    color: DEFAULT_CATEGORY_COLOR_CYCLE[index % DEFAULT_CATEGORY_COLOR_CYCLE.length] as string,
    icon,
    isSystem: false,
    order: index + 1,
  }),
)

/** Every reserved category id — the 11 defaults plus the system category — never assignable to a new custom category, even if the default was since deleted. */
export const DEFAULT_CATEGORY_IDS: ReadonlySet<CategoryId> = new Set([
  SYSTEM_CATEGORY_ID,
  ...DEFAULT_CATEGORIES.map((c) => c.id),
])

/** Throws DuplicateCategoryIdError if `id` is already in use or reserved by a default. */
export function assertCanCreateCategory(existing: readonly Category[], id: CategoryId): void {
  if (DEFAULT_CATEGORY_IDS.has(id) || existing.some((c) => c.id === id)) {
    throw new DuplicateCategoryIdError(id)
  }
}

/** Throws ProtectedCategoryError if `category` is the system category. */
export function assertMutableCategory(category: Category): void {
  if (category.isSystem) {
    throw new ProtectedCategoryError(category.id)
  }
}

/** Reassigns order 0..n-1 to match `orderedIds`' sequence — Invariant 5. */
export function reorderCategories(
  categories: readonly Category[],
  orderedIds: readonly CategoryId[],
): Category[] {
  if (orderedIds.length !== categories.length) {
    throw new Error(
      `reorderCategories: expected ${categories.length} ids, got ${orderedIds.length}`,
    )
  }

  const byId = new Map(categories.map((c) => [c.id, c]))
  return orderedIds.map((id, index) => {
    const category = byId.get(id)
    if (!category) throw new Error(`reorderCategories: unknown category id "${id}"`)
    return { ...category, order: index }
  })
}

/** Reassigns every expense pointing at `fromId` to `toId`, across all months — used when a category is deleted. */
export function reassignExpensesCategory(
  expenses: Readonly<Record<Month, Expense[]>>,
  fromId: CategoryId,
  toId: CategoryId,
): Record<Month, Expense[]> {
  const result: Record<Month, Expense[]> = {}
  for (const [month, monthExpenses] of Object.entries(expenses)) {
    result[month as Month] = monthExpenses.map((expense) =>
      expense.categoryId === fromId ? { ...expense, categoryId: toId } : expense,
    )
  }
  return result
}

/**
 * Reassigns `fromId` to `toId` inside every recurrence that references it — its
 * template, and any exception override — used alongside `reassignExpensesCategory`
 * when a category is deleted. A recurrence's `template.categoryId` and an
 * exception's `override.categoryId` outlive any already-materialised Expense
 * rows, so missing this leaves a dangling category id that resurfaces (Invariant
 * 3 violation) the next time the recurrence expands into a future month.
 */
export function reassignRecurrencesCategory(
  recurrences: readonly Recurrence[],
  fromId: CategoryId,
  toId: CategoryId,
): Recurrence[] {
  return recurrences.map((recurrence) => {
    const template =
      recurrence.template.categoryId === fromId
        ? { ...recurrence.template, categoryId: toId }
        : recurrence.template

    const exceptions = Object.fromEntries(
      Object.entries(recurrence.exceptions).map(([month, exception]) => {
        const reassigned = reassignExceptionCategory(exception, fromId, toId)
        return [month, reassigned]
      }),
    ) as Record<Month, RecurrenceException>

    return { ...recurrence, template, exceptions }
  })
}

function reassignExceptionCategory(
  exception: RecurrenceException,
  fromId: CategoryId,
  toId: CategoryId,
): RecurrenceException {
  if ('skip' in exception) return exception
  if (exception.override.categoryId !== fromId) return exception
  return { override: { ...exception.override, categoryId: toId } }
}
