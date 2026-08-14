import { diffMonths, offset, type Month } from '@/domain/month'
import type { Installment } from '@/domain/entities'

/**
 * Whether `installment` has an occurrence in `month` — the same arithmetic
 * `cardMonthlyCommitment` (`domain/creditCards.ts`) already applies per
 * installment, reused here to classify a whole list for the card detail
 * view without duplicating it.
 */
export function isInstallmentActiveIn(installment: Installment, month: Month): boolean {
  const offsetFromStart = diffMonths(installment.startMonth, month)
  return offsetFromStart >= 0 && offsetFromStart < installment.totalInstallments
}

/**
 * Whether `installment` has already run its full course by `month` — every
 * occurrence in the past. An installment whose `startMonth` is still ahead of
 * `month` is neither active nor completed; nothing in this screen creates one
 * that way (installments are created elsewhere, Phase 3+), so that third
 * state has no consumer here.
 */
export function isInstallmentCompletedBy(installment: Installment, month: Month): boolean {
  return diffMonths(installment.startMonth, month) >= installment.totalInstallments
}

/** The month an installment's last occurrence falls in — for "ends {month}" copy. */
export function installmentEndsIn(installment: Installment): Month {
  return offset(installment.startMonth, installment.totalInstallments - 1)
}
