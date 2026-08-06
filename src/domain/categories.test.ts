import { describe, expect, it } from 'vitest'
import {
  assertCanCreateCategory,
  assertMutableCategory,
  CategoryNotFoundError,
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_IDS,
  DuplicateCategoryIdError,
  InvalidCategoryIdError,
  normalizeCategoryId,
  ProtectedCategoryError,
  reassignExpensesCategory,
  reorderCategories,
  requireCategory,
} from './categories'
import type { Category, CategoryId, Expense } from './entities'
import { SYSTEM_CATEGORY_ID } from './entities'
import type { Cents } from './money'
import type { Month } from './month'

function makeCategory(id: string, order: number, isSystem = false): Category {
  return { id: id as CategoryId, color: 'oklch(0.62 0.10 250)', icon: null, isSystem, order }
}

function makeExpense(id: string, categoryId: string, month: Month): Expense {
  return {
    id: id as never,
    month,
    description: 'x',
    amount: 100 as Cents,
    categoryId: categoryId as CategoryId,
    kind: 'variable',
    date: '2026-08-01' as never,
  }
}

describe('normalizeCategoryId', () => {
  it('lowercases and hyphenates a plain name', () => {
    expect(normalizeCategoryId('Home Repairs')).toBe('home-repairs')
  })

  it('strips diacritics', () => {
    expect(normalizeCategoryId('Educação')).toBe('educacao')
  })

  it('collapses runs of non-alphanumeric characters into a single hyphen', () => {
    expect(normalizeCategoryId('Pets & Vet!!')).toBe('pets-vet')
  })

  it('trims leading and trailing hyphens', () => {
    expect(normalizeCategoryId('  --Groceries--  ')).toBe('groceries')
  })

  it('throws InvalidCategoryIdError when the name normalises to empty — P-12', () => {
    expect(() => normalizeCategoryId('🎉')).toThrow(InvalidCategoryIdError)
  })

  it('throws InvalidCategoryIdError for a blank name', () => {
    expect(() => normalizeCategoryId('   ')).toThrow(InvalidCategoryIdError)
  })
})

describe('DEFAULT_CATEGORIES / DEFAULT_CATEGORY_IDS', () => {
  it('has exactly 11 entries, ordered contiguously from 1', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(11)
    expect(DEFAULT_CATEGORIES.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('none of the defaults is the system category', () => {
    expect(DEFAULT_CATEGORIES.every((c) => !c.isSystem)).toBe(true)
  })

  it('includes the 11 defaults plus the system category id', () => {
    expect(DEFAULT_CATEGORY_IDS.size).toBe(12)
    expect(DEFAULT_CATEGORY_IDS.has(SYSTEM_CATEGORY_ID)).toBe(true)
    for (const category of DEFAULT_CATEGORIES) {
      expect(DEFAULT_CATEGORY_IDS.has(category.id)).toBe(true)
    }
  })
})

describe('reorderCategories', () => {
  it('reassigns order 0..n-1 to match the given id sequence', () => {
    const categories = [makeCategory('a', 0), makeCategory('b', 1), makeCategory('c', 2)]

    const result = reorderCategories(categories, ['c', 'a', 'b'] as CategoryId[])

    expect(result.map((c) => c.id)).toEqual(['c', 'a', 'b'])
    expect(result.map((c) => c.order)).toEqual([0, 1, 2])
  })

  it('leaves category identity/fields untouched besides order', () => {
    const categories = [makeCategory('a', 0), makeCategory('b', 1)]

    const result = reorderCategories(categories, ['b', 'a'] as CategoryId[])

    expect(result[0]).toMatchObject({ id: 'b', order: 0, icon: null })
    expect(result[1]).toMatchObject({ id: 'a', order: 1, icon: null })
  })

  it('throws when an id in the sequence does not match any given category', () => {
    const categories = [makeCategory('a', 0)]
    expect(() => reorderCategories(categories, ['a', 'ghost'] as CategoryId[])).toThrow(
      /unknown category id "ghost"/,
    )
  })
})

describe('reassignExpensesCategory', () => {
  it('reassigns every expense pointing at fromId to toId, across all months', () => {
    const expenses: Record<Month, Expense[]> = {
      ['2026-07' as Month]: [makeExpense('e1', 'lazer', '2026-07' as Month)],
      ['2026-08' as Month]: [
        makeExpense('e2', 'lazer', '2026-08' as Month),
        makeExpense('e3', 'health', '2026-08' as Month),
      ],
    }

    const result = reassignExpensesCategory(expenses, 'lazer' as CategoryId, SYSTEM_CATEGORY_ID)

    expect(result['2026-07' as Month]?.[0]?.categoryId).toBe(SYSTEM_CATEGORY_ID)
    expect(result['2026-08' as Month]?.[0]?.categoryId).toBe(SYSTEM_CATEGORY_ID)
    expect(result['2026-08' as Month]?.[1]?.categoryId).toBe('health')
  })

  it('is a no-op when no expense references fromId', () => {
    const expenses: Record<Month, Expense[]> = {
      ['2026-07' as Month]: [makeExpense('e1', 'health', '2026-07' as Month)],
    }

    const result = reassignExpensesCategory(expenses, 'lazer' as CategoryId, SYSTEM_CATEGORY_ID)

    expect(result).toEqual(expenses)
  })

  it('does not mutate the input', () => {
    const expenses: Record<Month, Expense[]> = {
      ['2026-07' as Month]: [makeExpense('e1', 'lazer', '2026-07' as Month)],
    }
    const snapshot = structuredClone(expenses)

    reassignExpensesCategory(expenses, 'lazer' as CategoryId, SYSTEM_CATEGORY_ID)

    expect(expenses).toEqual(snapshot)
  })
})

describe('DuplicateCategoryIdError', () => {
  it('carries the colliding id', () => {
    const error = new DuplicateCategoryIdError('groceries' as CategoryId)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('DuplicateCategoryIdError')
    expect(error.id).toBe('groceries')
  })
})

describe('assertCanCreateCategory', () => {
  it('throws DuplicateCategoryIdError when the id matches an existing category', () => {
    const existing = [makeCategory('groceries', 1)]
    expect(() => assertCanCreateCategory(existing, 'groceries' as CategoryId)).toThrow(
      DuplicateCategoryIdError,
    )
  })

  it('throws DuplicateCategoryIdError when the id matches a default not currently present', () => {
    expect(() => assertCanCreateCategory([], 'housing' as CategoryId)).toThrow(
      DuplicateCategoryIdError,
    )
  })

  it('does not throw for a genuinely free id', () => {
    expect(() => assertCanCreateCategory([], 'pets' as CategoryId)).not.toThrow()
  })
})

describe('assertMutableCategory', () => {
  it('throws ProtectedCategoryError for the system category', () => {
    expect(() => assertMutableCategory(makeCategory(SYSTEM_CATEGORY_ID, 0, true))).toThrow(
      ProtectedCategoryError,
    )
  })

  it('does not throw for a non-system category', () => {
    expect(() => assertMutableCategory(makeCategory('groceries', 1))).not.toThrow()
  })
})

describe('requireCategory', () => {
  it('returns the matching category', () => {
    const category = makeCategory('groceries', 1)
    expect(requireCategory([category], 'groceries' as CategoryId)).toBe(category)
  })

  it('throws CategoryNotFoundError when no category matches', () => {
    expect(() => requireCategory([], 'ghost' as CategoryId)).toThrow(CategoryNotFoundError)
  })
})
