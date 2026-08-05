import { describe, expect, it } from 'vitest'
import { MAX_TOTAL_INSTALLMENTS, MIN_TOTAL_INSTALLMENTS, SYSTEM_CATEGORY_ID } from './entities'

// entities.ts is otherwise types only — no logic to unit test. These three
// constants are the exception: P-10 in the predecessor filed every projected
// installment under a category id that had been silently renamed, because the
// fallback was a string literal repeated at each call site rather than one
// named constant checked in one place (domain/invariants.ts).

describe('SYSTEM_CATEGORY_ID', () => {
  it('is the one category id every category list must contain', () => {
    expect(SYSTEM_CATEGORY_ID).toBe('other')
  })
})

describe('installment count bounds', () => {
  it('matches the invariant in 03-domain-model.md: 2 <= totalInstallments <= 48', () => {
    expect(MIN_TOTAL_INSTALLMENTS).toBe(2)
    expect(MAX_TOTAL_INSTALLMENTS).toBe(48)
  })
})
