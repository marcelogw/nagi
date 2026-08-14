import { useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cardMonthlyCommitment } from '@/domain/creditCards'
import type { CreditCard, Installment } from '@/domain/entities'
import { useFormatters } from '@/i18n/formatters'
import { diffMonths, type Month } from '@/domain/month'
import type { Cents } from '@/domain/money'
import { useCardActiveCountText } from './useCardActiveCountText'
import { installmentEndsIn, isInstallmentActiveIn, isInstallmentCompletedBy } from './installments'

type CardDetailDialogProps = {
  card: CreditCard | null
  installments: readonly Installment[]
  month: Month
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Card detail overlay — active and completed installments, and this
 * month's commitment. Trimmed from `cartoes.card.html`'s detail: no
 * month-by-month trend chart (the domain has no historical series to draw
 * one from — only the current snapshot `Installment[]` gives), no owner,
 * no per-installment category icon (`Installment` has no `categoryId`).
 */
export function CardDetailDialog({
  card,
  installments,
  month,
  open,
  onOpenChange,
}: CardDetailDialogProps) {
  const t = useTranslations('cards.detail')
  const format = useFormatters()

  const active = useMemo(
    () => installments.filter((installment) => isInstallmentActiveIn(installment, month)),
    [installments, month],
  )
  const completed = useMemo(
    () => installments.filter((installment) => isInstallmentCompletedBy(installment, month)),
    [installments, month],
  )
  const commitment = card ? cardMonthlyCommitment(installments, card.id, month) : null
  const activeCountText = useCardActiveCountText(active.length)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="card-detail-dialog">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="size-icon-tile shrink-0 rounded-sm"
            style={{ background: card?.color }}
          />
          <DialogTitle className="text-subhead">{card?.name}</DialogTitle>
        </div>

        <DialogDescription className="sr-only">{card ? activeCountText : ''}</DialogDescription>

        <div className="flex items-baseline justify-between rounded-md bg-surface-subtle px-4 py-3">
          <span className="text-caption text-foreground-muted">{t('thisMonth')}</span>
          <span className="numeric text-subhead font-semibold text-foreground">
            {commitment !== null ? format.currency(commitment) : null}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <p className="m-0 text-caption tracking-caps text-foreground-subtle uppercase">
            {t('activeInstallments')}
          </p>
          {active.length === 0 ? (
            <p className="m-0 text-body text-foreground-subtle">{t('noActiveInstallments')}</p>
          ) : (
            <ul
              className="m-0 flex list-none flex-col gap-3 p-0"
              data-testid="card-detail-active-list"
            >
              {active.map((installment) => {
                const number = diffMonths(installment.startMonth, month) + 1
                return (
                  <li key={installment.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-body text-foreground">
                      {installment.name}
                    </span>
                    <span className="numeric shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-caption text-foreground-muted">
                      {number}/{installment.totalInstallments}
                    </span>
                    <span className="shrink-0 text-caption text-foreground-subtle">
                      {t('endsOn', { month: format.month(installmentEndsIn(installment)) })}
                    </span>
                    <span className="numeric shrink-0 text-body text-foreground">
                      {format.currency(installment.amountPerInstallment)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {completed.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-caption tracking-caps text-foreground-subtle uppercase">
              {t('completedInstallments')}
            </p>
            <ul
              className="m-0 flex list-none flex-col gap-3 p-0"
              data-testid="card-detail-completed-list"
            >
              {completed.map((installment) => (
                <li key={installment.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-body text-foreground">
                    {installment.name}
                  </span>
                  <span className="numeric shrink-0 text-body text-foreground">
                    {format.currency(
                      (installment.amountPerInstallment * installment.totalInstallments) as Cents,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
