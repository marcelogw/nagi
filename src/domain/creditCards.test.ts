import { describe, expect, it } from 'vitest'
import {
  CardNotFoundError,
  cardMonthlyCommitment,
  cardUsageRatio,
  InvalidCardReassignmentError,
  reassignInstallmentsCard,
  reorderCards,
  requireCard,
} from './creditCards'
import type { CardId, CreditCard, Installment } from './entities'
import type { Cents } from './money'
import type { Month } from './month'
import type { Uuid } from './ids'

function makeCard(id: string, order: number, limit: Cents | null = null): CreditCard {
  return { id: id as CardId, name: id, color: 'oklch(0.62 0.10 250)', limit, order }
}

function makeInstallment(
  id: string,
  cardId: string,
  totalInstallments: number,
  amountPerInstallment: Cents,
  startMonth: Month,
): Installment {
  return {
    id: id as Uuid,
    name: id,
    cardId: cardId as CardId,
    totalInstallments,
    amountPerInstallment,
    startMonth,
  }
}

describe('reorderCards', () => {
  it('reassigns order 0..n-1 to match the given id sequence', () => {
    const cards = [makeCard('a', 0), makeCard('b', 1), makeCard('c', 2)]

    const result = reorderCards(cards, ['c', 'a', 'b'] as CardId[])

    expect(result.map((c) => c.id)).toEqual(['c', 'a', 'b'])
    expect(result.map((c) => c.order)).toEqual([0, 1, 2])
  })

  it('throws when orderedIds omits a card', () => {
    const cards = [makeCard('a', 0), makeCard('b', 1)]
    expect(() => reorderCards(cards, ['a'] as CardId[])).toThrow(/expected 2 ids, got 1/)
  })

  it('throws when an id in the sequence does not match any given card', () => {
    const cards = [makeCard('a', 0), makeCard('b', 1)]
    expect(() => reorderCards(cards, ['a', 'ghost'] as CardId[])).toThrow(/unknown card id "ghost"/)
  })
})

describe('requireCard', () => {
  it('returns the matching card', () => {
    const card = makeCard('a', 0)
    expect(requireCard([card], 'a' as CardId)).toBe(card)
  })

  it('throws CardNotFoundError carrying the missing id when no card matches', () => {
    expect(() => requireCard([], 'ghost' as CardId)).toThrow(CardNotFoundError)
    try {
      requireCard([], 'ghost' as CardId)
    } catch (error) {
      expect(error).toBeInstanceOf(CardNotFoundError)
      expect((error as CardNotFoundError).id).toBe('ghost')
    }
  })
})

describe('reassignInstallmentsCard', () => {
  it('reassigns every installment pointing at fromId to toId', () => {
    const installments = [
      makeInstallment('i1', 'nubank', 6, 5000 as Cents, '2026-01' as Month),
      makeInstallment('i2', 'itau', 3, 2000 as Cents, '2026-01' as Month),
    ]

    const result = reassignInstallmentsCard(installments, 'nubank' as CardId, 'itau' as CardId)

    expect(result[0]?.cardId).toBe('itau')
    expect(result[1]?.cardId).toBe('itau')
  })

  it('is a no-op when no installment references fromId', () => {
    const installments = [makeInstallment('i1', 'itau', 3, 2000 as Cents, '2026-01' as Month)]
    const result = reassignInstallmentsCard(installments, 'nubank' as CardId, 'itau' as CardId)
    expect(result).toEqual(installments)
  })

  it('does not mutate the input', () => {
    const installments = [makeInstallment('i1', 'nubank', 6, 5000 as Cents, '2026-01' as Month)]
    const snapshot = structuredClone(installments)

    reassignInstallmentsCard(installments, 'nubank' as CardId, 'itau' as CardId)

    expect(installments).toEqual(snapshot)
  })

  it('throws InvalidCardReassignmentError when fromId equals toId', () => {
    const installments = [makeInstallment('i1', 'nubank', 6, 5000 as Cents, '2026-01' as Month)]
    expect(() =>
      reassignInstallmentsCard(installments, 'nubank' as CardId, 'nubank' as CardId),
    ).toThrow(InvalidCardReassignmentError)
  })
})

describe('cardMonthlyCommitment', () => {
  it('sums amountPerInstallment for installments active in the given month', () => {
    const installments = [
      // active 2026-01..2026-03 (3 installments)
      makeInstallment('i1', 'nubank', 3, 10000 as Cents, '2026-01' as Month),
      // active 2026-02..2026-04
      makeInstallment('i2', 'nubank', 3, 5000 as Cents, '2026-02' as Month),
      // different card, must not count
      makeInstallment('i3', 'itau', 3, 99999 as Cents, '2026-01' as Month),
    ]

    const commitment = cardMonthlyCommitment(installments, 'nubank' as CardId, '2026-02' as Month)

    expect(commitment).toBe(15000)
  })

  it('excludes an installment whose month is before its startMonth', () => {
    const installments = [makeInstallment('i1', 'nubank', 3, 10000 as Cents, '2026-03' as Month)]
    expect(cardMonthlyCommitment(installments, 'nubank' as CardId, '2026-01' as Month)).toBe(0)
  })

  it('excludes an installment whose month is at or after startMonth + totalInstallments', () => {
    const installments = [makeInstallment('i1', 'nubank', 3, 10000 as Cents, '2026-01' as Month)]
    expect(cardMonthlyCommitment(installments, 'nubank' as CardId, '2026-04' as Month)).toBe(0)
  })

  it('returns 0 for a card with no installments', () => {
    expect(cardMonthlyCommitment([], 'nubank' as CardId, '2026-01' as Month)).toBe(0)
  })
})

describe('cardUsageRatio', () => {
  it('returns commitment / limit when a limit is set', () => {
    expect(cardUsageRatio(5000 as Cents, 10000 as Cents)).toBe(0.5)
  })

  it('returns null when the card has no limit', () => {
    expect(cardUsageRatio(5000 as Cents, null)).toBeNull()
  })

  it('returns 0 when commitment is zero and a limit is set', () => {
    expect(cardUsageRatio(0 as Cents, 10000 as Cents)).toBe(0)
  })

  it('returns 0 for a zero limit with zero commitment, never NaN', () => {
    expect(cardUsageRatio(0 as Cents, 0 as Cents)).toBe(0)
  })

  it('returns 1 for a zero limit with any commitment, never Infinity', () => {
    expect(cardUsageRatio(500 as Cents, 0 as Cents)).toBe(1)
  })
})
