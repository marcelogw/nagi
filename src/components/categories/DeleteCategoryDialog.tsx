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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
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
            onClick={onConfirm}
          >
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
