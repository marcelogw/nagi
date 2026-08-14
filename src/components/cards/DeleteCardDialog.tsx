import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'use-intl'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CardId } from '@/domain/entities'

type DeleteCardDialogProps = {
  cardName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** This month's active installments on the card being deleted — drives the plural body copy. */
  activeInstallmentCount: number
  /** Every other card, as a reassignment target. Empty means there is nowhere to move the installments to. */
  otherCards: ReadonlyArray<{ id: CardId; name: string }>
  onConfirm: (reassignToId: CardId) => void
}

/**
 * Confirmation for deleting a card — the same canonical shape as
 * `DeleteCategoryDialog`, plus the one real difference `deleteCard`'s own
 * signature demands: `deleteCard(id, reassignToId)` requires a *different*
 * existing card, unlike `deleteCategory`, which auto-reassigns to the system
 * category with no choice to make. This is the Select the card's own exit
 * criteria actually needs — `/categories` never had a field for one.
 */
export function DeleteCardDialog({
  cardName,
  open,
  onOpenChange,
  activeInstallmentCount,
  otherCards,
  onConfirm,
}: DeleteCardDialogProps) {
  const t = useTranslations('cards.delete')
  const [reassignTo, setReassignTo] = useState<CardId | undefined>(otherCards[0]?.id)
  const confirmedRef = useRef(false)

  useEffect(() => {
    if (open) setReassignTo(otherCards[0]?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const canDelete = otherCards.length > 0 && reassignTo !== undefined

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (confirmedRef.current) event.preventDefault()
          confirmedRef.current = false
        }}
      >
        <AlertDialogTitle className="text-body">{t('title', { name: cardName })}</AlertDialogTitle>

        <AlertDialogDescription className="text-pretty">
          {otherCards.length === 0
            ? t('onlyCard', { name: cardName })
            : t('body', { count: activeInstallmentCount })}
        </AlertDialogDescription>

        {otherCards.length > 0 ? (
          <div className="flex flex-col gap-2">
            <label
              className="text-caption font-semibold text-foreground-muted"
              htmlFor="card-reassign"
            >
              {t('reassignLabel')}
            </label>
            <Select value={reassignTo} onValueChange={(value) => setReassignTo(value as CardId)}>
              <SelectTrigger
                id="card-reassign"
                data-testid="card-reassign-select"
                className="w-full"
              >
                <SelectValue placeholder={t('reassignPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {otherCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel size="lg" data-testid="delete-card-cancel">
            {t('cancel')}
          </AlertDialogCancel>

          <AlertDialogAction
            variant="destructive"
            size="lg"
            data-testid="delete-card-confirm"
            disabled={!canDelete}
            onClick={() => {
              if (!reassignTo) return
              confirmedRef.current = true
              onConfirm(reassignTo)
            }}
          >
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
