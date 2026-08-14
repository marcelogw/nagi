import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '@/components/ui/button'
import type { CardId, CreditCard } from '@/domain/entities'
import { currentMonth } from '@/domain/month'
import { useDragReorder } from '@/hooks/use-drag-reorder'
import { useCatalogStore } from '@/stores/catalog-store'
import { usePlanningStore } from '@/stores/planning-store'
import { CARD_COLOR_SWATCHES } from './cardColors'
import { CardDetailDialog } from './CardDetailDialog'
import { CardFormDialog, type CardFormValues } from './CardFormDialog'
import { CardTile } from './CardTile'
import { DeleteCardDialog } from './DeleteCardDialog'
import { isInstallmentActiveIn } from './installments'

const BLANK_CARD: CardFormValues = {
  name: '',
  color: CARD_COLOR_SWATCHES[0] as string,
  limit: null,
}

/**
 * /cards — grid, create, edit, delete-with-reassignment, drag reorder, and
 * a per-card detail overlay. `cartoes.card.html` models a richer card
 * (brand, last-4 digits, owner, billing cycle) and a per-installment
 * category icon in every row; `CreditCard`/`Installment`
 * (`domain/entities.ts`) support none of it, so both are trimmed to the
 * fields the real domain has, matching `CardFormDialog`/`CardTile`'s own doc
 * comments for the field-by-field breakdown.
 */
export function CardsScreen() {
  const t = useTranslations('cards.screen')
  const month = currentMonth()

  const cards = useCatalogStore((state) => state.creditCards)
  const createCard = useCatalogStore((state) => state.createCard)
  const updateCard = useCatalogStore((state) => state.updateCard)
  const deleteCard = useCatalogStore((state) => state.deleteCard)
  const reorderCards = useCatalogStore((state) => state.reorderCards)
  const installments = usePlanningStore((state) => state.installments)

  const [formTarget, setFormTarget] = useState<CreditCard | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CreditCard | null>(null)
  const [detailTarget, setDetailTarget] = useState<CreditCard | null>(null)
  const newCardButtonRef = useRef<HTMLButtonElement>(null)

  // Radix's own default close-focus restore turned out not to fire
  // reliably for this Dialog even in a real browser (verified: cancelling
  // an edit left focus on <body>, not the "Edit" button that opened it) —
  // captured explicitly instead, at the moment the dialog opens, and
  // restored on every close path (cancel, Escape, outside click, and a
  // successful submit, none of which go through the same code path).
  const formTriggerRef = useRef<HTMLElement | null>(null)
  function closeForm() {
    setFormTarget(null)
    const trigger = formTriggerRef.current
    setTimeout(() => trigger?.focus(), 0)
  }

  const lastDeleteTargetRef = useRef<CreditCard | null>(null)
  if (deleteTarget) lastDeleteTargetRef.current = deleteTarget
  const deleteTargetForDisplay = deleteTarget ?? lastDeleteTargetRef.current

  const ids = cards.map((card) => card.id)
  const drag = useDragReorder<CardId>(ids, reorderCards)

  function openCreate() {
    formTriggerRef.current = document.activeElement as HTMLElement
    setFormTarget('new')
  }

  function openEdit(card: CreditCard) {
    formTriggerRef.current = document.activeElement as HTMLElement
    setFormTarget(card)
  }

  function handleSubmit(values: CardFormValues) {
    if (formTarget === 'new') {
      createCard(values.name, { color: values.color, limit: values.limit })
    } else if (formTarget) {
      updateCard(formTarget.id, { name: values.name, color: values.color, limit: values.limit })
    }
    closeForm()
  }

  function handleDeleteConfirm(reassignToId: CardId) {
    if (!deleteTarget) return
    deleteCard(deleteTarget.id, reassignToId)
    setDeleteTarget(null)
    setTimeout(() => newCardButtonRef.current?.focus(), 0)
  }

  const deleteTargetInstallments = deleteTargetForDisplay
    ? installments.filter((installment) => installment.cardId === deleteTargetForDisplay.id)
    : []
  const deleteTargetActiveCount = deleteTargetForDisplay
    ? deleteTargetInstallments.filter((installment) => isInstallmentActiveIn(installment, month))
        .length
    : 0
  const deleteTargetOtherCards = deleteTargetForDisplay
    ? cards.filter((card) => card.id !== deleteTargetForDisplay.id)
    : []

  return (
    <div className="flex flex-col gap-5" data-testid="cards-screen">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-title font-extrabold tracking-tight text-foreground">
            {t('title')}
          </h2>
          <p className="text-body text-foreground-muted">
            {t('subtitle', { count: cards.length })}
          </p>
        </div>

        <Button
          ref={newCardButtonRef}
          type="button"
          size="default"
          data-testid="card-new"
          onClick={openCreate}
        >
          <Plus aria-hidden className="size-icon-sm" />
          {t('new')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 wide:grid-cols-2">
        {cards.map((card) => (
          <CardTile
            key={card.id}
            card={card}
            month={month}
            installments={installments.filter((installment) => installment.cardId === card.id)}
            isDragging={drag.draggingId === card.id}
            onEdit={() => openEdit(card)}
            onDelete={() => setDeleteTarget(card)}
            onDetail={() => setDetailTarget(card)}
            onDragStart={(event) => drag.handleDragStart(event, card.id)}
            onDragEnd={drag.handleDragEnd}
            onDragOver={(event) => drag.handleDragOver(event, card.id)}
            onDrop={drag.handleDrop}
            onKeyDown={(event) => drag.handleKeyDown(event, card.id)}
          />
        ))}
      </div>

      <CardFormDialog
        open={formTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeForm()
        }}
        mode={formTarget === 'new' || formTarget === null ? 'create' : 'edit'}
        initialValues={
          formTarget && formTarget !== 'new'
            ? { name: formTarget.name, color: formTarget.color, limit: formTarget.limit }
            : BLANK_CARD
        }
        onSubmit={handleSubmit}
      />

      <DeleteCardDialog
        cardName={deleteTargetForDisplay?.name ?? ''}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        activeInstallmentCount={deleteTargetActiveCount}
        otherCards={deleteTargetOtherCards}
        onConfirm={handleDeleteConfirm}
      />

      <CardDetailDialog
        card={detailTarget}
        month={month}
        installments={
          detailTarget
            ? installments.filter((installment) => installment.cardId === detailTarget.id)
            : []
        }
        open={detailTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null)
        }}
      />
    </div>
  )
}
