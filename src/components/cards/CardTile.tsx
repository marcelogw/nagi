import { GripVertical, Info, SquarePen, Trash2 } from 'lucide-react'
import { useMemo, type DragEvent, type KeyboardEvent } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '@/components/ui/button'
import { cardMonthlyCommitment, cardUsageRatio } from '@/domain/creditCards'
import type { CreditCard, Installment } from '@/domain/entities'
import type { Month } from '@/domain/month'
import type { Cents } from '@/domain/money'
import { useFormatters } from '@/i18n/formatters'
import { useCardActiveCountText } from './useCardActiveCountText'
import { isInstallmentActiveIn } from './installments'

type CardTileProps = {
  card: CreditCard
  installments: readonly Installment[]
  month: Month
  isDragging: boolean
  onEdit: () => void
  onDelete: () => void
  onDetail: () => void
  onDragStart: (event: DragEvent) => void
  onDragEnd: () => void
  onDragOver: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
  onKeyDown: (event: KeyboardEvent) => void
}

function CardActiveCountLabel({ count }: { count: number }) {
  return (
    <p className="m-0 text-caption tracking-caps text-foreground-subtle uppercase">
      {useCardActiveCountText(count)}
    </p>
  )
}

/** Own `t` (`cards.usage`) so `scripts/check-messages.mjs` can trace the reference — see the repo-wide rule that a translator variable can only be named `t`. */
function CardUsageFooter({ commitment, limit }: { commitment: Cents; limit: Cents | null }) {
  const t = useTranslations('cards.usage')
  const format = useFormatters()
  const usageRatio = cardUsageRatio(commitment, limit)

  return (
    <div className="mt-auto border-t border-border px-3 py-3">
      {limit !== null ? (
        <>
          <div className="mb-2 flex items-baseline justify-between text-caption text-foreground-muted">
            <span>
              {t('used', { used: format.currency(commitment), limit: format.currency(limit) })}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-foreground-muted"
              style={{ width: `${Math.round((usageRatio ?? 0) * 100)}%` }}
            />
          </div>
        </>
      ) : (
        <p className="m-0 text-caption text-foreground-subtle">{t('noLimit')}</p>
      )}
    </div>
  )
}

/**
 * One card in the `/cards` grid — trimmed from `cartoes.card.html`'s tile:
 * no brand chip, no last-4 digits, no owner avatar (`CreditCard` has none of
 * those fields), and no per-installment category icon or row list on the
 * tile itself (`Installment` carries no `categoryId`, and the full active-
 * installment list lives in the detail overlay, not repeated here). What
 * stays is what the domain actually supports: name, colour, this month's
 * commitment, an active-installment count, and the limit bar.
 */
export function CardTile({
  card,
  installments,
  month,
  isDragging,
  onEdit,
  onDelete,
  onDetail,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onKeyDown,
}: CardTileProps) {
  const t = useTranslations('cards.row')
  const format = useFormatters()

  const activeCount = useMemo(
    () => installments.filter((installment) => isInstallmentActiveIn(installment, month)).length,
    [installments, month],
  )
  const commitment = useMemo(
    () => cardMonthlyCommitment(installments, card.id, month),
    [installments, card.id, month],
  )

  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm data-dragging:opacity-50"
      data-testid={`card-tile-${card.id}`}
      data-dragging={isDragging || undefined}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div aria-hidden className="h-1" style={{ background: card.color }} />

      <div className="flex items-center gap-3 border-b border-border p-3">
        <button
          type="button"
          draggable
          aria-label={t('reorder', { name: card.name })}
          data-testid={`card-reorder-${card.id}`}
          className="flex size-icon-sm shrink-0 cursor-grab items-center justify-center rounded-sm text-foreground-subtle transition-colors duration-fast ease-settle hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:cursor-grabbing"
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onKeyDown={onKeyDown}
        >
          <GripVertical aria-hidden className="size-icon-xs" />
        </button>

        <span className="min-w-0 flex-1 truncate text-body font-bold text-foreground">
          {card.name}
        </span>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('detail', { name: card.name })}
            data-testid={`card-detail-${card.id}`}
            onClick={onDetail}
          >
            <Info aria-hidden className="size-icon-sm" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('edit', { name: card.name })}
            data-testid={`card-edit-${card.id}`}
            onClick={onEdit}
          >
            <SquarePen aria-hidden className="size-icon-sm" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('delete', { name: card.name })}
            data-testid={`card-delete-${card.id}`}
            className="hover:bg-danger-tint hover:text-danger-text"
            onClick={onDelete}
          >
            <Trash2 aria-hidden className="size-icon-sm" />
          </Button>
        </div>
      </div>

      <div className="flex items-baseline justify-between bg-surface-subtle px-3 py-3">
        <span className="text-caption text-foreground-muted">{format.month(month)}</span>
        <span className="numeric text-subhead font-semibold text-foreground">
          {format.currency(commitment)}
        </span>
      </div>

      <div className="px-3 py-3">
        <CardActiveCountLabel count={activeCount} />
      </div>

      <CardUsageFooter commitment={commitment} limit={card.limit} />
    </div>
  )
}
