import type { CardId, CreditCard, Installment } from './entities'
import { add, ZERO_CENTS, type Cents } from './money'
import { diffMonths, type Month } from './month'

export class CardNotFoundError extends Error {
  readonly id: CardId

  constructor(id: CardId) {
    super(`Credit card not found: "${id}"`)
    this.name = 'CardNotFoundError'
    this.id = id
  }
}

export class InvalidCardReassignmentError extends Error {
  readonly id: CardId

  constructor(id: CardId) {
    super(`Cannot reassign installments from a card to itself: "${id}"`)
    this.name = 'InvalidCardReassignmentError'
    this.id = id
  }
}

/** Returns `card`, or throws CardNotFoundError. */
export function requireCard(cards: readonly CreditCard[], id: CardId): CreditCard {
  const card = cards.find((c) => c.id === id)
  if (!card) throw new CardNotFoundError(id)
  return card
}

/** Reassigns order 0..n-1 to match `orderedIds`' sequence — Invariant 5. */
export function reorderCards(
  cards: readonly CreditCard[],
  orderedIds: readonly CardId[],
): CreditCard[] {
  if (orderedIds.length !== cards.length) {
    throw new Error(`reorderCards: expected ${cards.length} ids, got ${orderedIds.length}`)
  }

  const byId = new Map(cards.map((c) => [c.id, c]))
  return orderedIds.map((id, index) => {
    const card = byId.get(id)
    if (!card) throw new Error(`reorderCards: unknown card id "${id}"`)
    return { ...card, order: index }
  })
}

/**
 * Reassigns every installment pointing at `fromId` to `toId` — used when a
 * card is deleted, per the mandatory reassignment (never a silent delete) —
 * P-16. `fromId === toId` is always a caller bug, not a valid no-op.
 */
export function reassignInstallmentsCard(
  installments: readonly Installment[],
  fromId: CardId,
  toId: CardId,
): Installment[] {
  if (fromId === toId) {
    throw new InvalidCardReassignmentError(fromId)
  }
  return installments.map((installment) =>
    installment.cardId === fromId ? { ...installment, cardId: toId } : installment,
  )
}

/**
 * This month's total due across every installment on `cardId` — the one
 * well-defined usage metric (P-15): a *monthly* commitment, comparable
 * directly against a *monthly* `limit`. The predecessor summed each
 * installment's full remaining balance (a lifetime commitment) and divided by
 * the monthly limit, which could read over 100% for a card nowhere near its
 * actual limit.
 */
export function cardMonthlyCommitment(
  installments: readonly Installment[],
  cardId: CardId,
  month: Month,
): Cents {
  return installments
    .filter((installment) => installment.cardId === cardId)
    .filter((installment) => {
      const offset = diffMonths(installment.startMonth, month)
      return offset >= 0 && offset < installment.totalInstallments
    })
    .reduce((total, installment) => add(total, installment.amountPerInstallment), ZERO_CENTS)
}

/** `commitment / limit`, or `null` when the card has no limit to measure against. */
export function cardUsageRatio(commitment: Cents, limit: Cents | null): number | null {
  if (limit === null) return null
  if (limit === 0) return commitment > 0 ? 1 : 0
  return commitment / limit
}
