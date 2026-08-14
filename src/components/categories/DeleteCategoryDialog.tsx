import { useRef } from 'react'
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

type DeleteCategoryDialogProps = {
  categoryName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/**
 * Confirmation for deleting a category — the shape from
 * `nagi-design/reference/canonical-examples.md`. Copy matches what
 * `deleteCategory` actually does: an immediate reassignment to the system
 * category, never a dangling or "uncategorised" state.
 */
export function DeleteCategoryDialog({
  categoryName,
  open,
  onOpenChange,
  onConfirm,
}: DeleteCategoryDialogProps) {
  const t = useTranslations('categories.delete')

  // Cancel leaves the row that opened this dialog in place, so Radix's
  // default close behaviour — restore focus to that trigger — is correct
  // and left alone. Confirm removes that same row, so the same restore
  // always lands on a detached node and silently drops focus to <body>;
  // `onConfirm` is expected to send focus somewhere real itself, and this
  // flag is only what stops Radix from undoing that right afterwards.
  const confirmedRef = useRef(false)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (confirmedRef.current) event.preventDefault()
          confirmedRef.current = false
        }}
      >
        <AlertDialogTitle className="text-body">{t('title')}</AlertDialogTitle>

        <AlertDialogDescription className="text-pretty">
          {t('body', { name: categoryName })}
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel size="lg" data-testid="delete-category-cancel">
            {t('cancel')}
          </AlertDialogCancel>

          <AlertDialogAction
            variant="destructive"
            size="lg"
            data-testid="delete-category-confirm"
            onClick={() => {
              confirmedRef.current = true
              onConfirm()
            }}
          >
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
