import { describe, expect, it } from 'vitest'
import type { CardId, Installment } from '@/domain/entities'
import type { Month } from '@/domain/month'
import type { Uuid } from '@/domain/ids'
import type { Cents } from '@/domain/money'
import { installmentEndsIn, isInstallmentActiveIn, isInstallmentCompletedBy } from './installments'

function makeInstallment(startMonth: Month, totalInstallments: number): Installment {
  return {
    id: 'i1' as Uuid,
    name: 'Laptop',
    cardId: 'nubank' as CardId,
    totalInstallments,
    amountPerInstallment: 5000 as Cents,
    startMonth,
  }
}

describe('isInstallmentActiveIn', () => {
  it('is active on its first month', () => {
    expect(isInstallmentActiveIn(makeInstallment('2026-01' as Month, 6), '2026-01' as Month)).toBe(
      true,
    )
  })

  it('is active on its last month', () => {
    expect(isInstallmentActiveIn(makeInstallment('2026-01' as Month, 6), '2026-06' as Month)).toBe(
      true,
    )
  })

  it('is not active the month after it ends', () => {
    expect(isInstallmentActiveIn(makeInstallment('2026-01' as Month, 6), '2026-07' as Month)).toBe(
      false,
    )
  })

  it('is not active before it starts', () => {
    expect(isInstallmentActiveIn(makeInstallment('2026-03' as Month, 6), '2026-01' as Month)).toBe(
      false,
    )
  })
})

describe('isInstallmentCompletedBy', () => {
  it('is not completed while still active', () => {
    expect(
      isInstallmentCompletedBy(makeInstallment('2026-01' as Month, 6), '2026-06' as Month),
    ).toBe(false)
  })

  it('is completed the month after it ends', () => {
    expect(
      isInstallmentCompletedBy(makeInstallment('2026-01' as Month, 6), '2026-07' as Month),
    ).toBe(true)
  })
})

describe('installmentEndsIn', () => {
  it('returns the month of the last occurrence', () => {
    expect(installmentEndsIn(makeInstallment('2026-01' as Month, 6))).toBe('2026-06')
  })

  it('carries across a year boundary', () => {
    expect(installmentEndsIn(makeInstallment('2026-11' as Month, 4))).toBe('2027-02')
  })

  it('is the start month itself for a single-instalment plan', () => {
    expect(installmentEndsIn(makeInstallment('2026-05' as Month, 1))).toBe('2026-05')
  })
})
