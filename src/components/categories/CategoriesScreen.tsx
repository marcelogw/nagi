import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '@/components/ui/button'
import { DuplicateCategoryIdError, InvalidCategoryIdError } from '@/domain/categories'
import type { Category, CategoryId } from '@/domain/entities'
import { useDragReorder } from '@/hooks/use-drag-reorder'
import { useCatalogStore } from '@/stores/catalog-store'
import {
  CategoryFormDialog,
  type CategoryFormValues,
  type CategoryNameErrorKind,
} from './CategoryFormDialog'
import { CATEGORY_COLOR_SWATCHES, categoryLabel, useDefaultCategoryLabels } from './categoryLabels'
import { CategoryRow } from './CategoryRow'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'

const BLANK_CATEGORY: CategoryFormValues = {
  name: '',
  color: CATEGORY_COLOR_SWATCHES[0] as string,
  icon: null,
}

/**
 * /categories — list, create, edit, delete-with-confirmation, drag reorder.
 *
 * `categorias.card.html` groups rows into three buckets (Entradas/Guardou/
 * Despesas) with a period selector reading usage totals from the ledger's
 * transactions. Neither exists here: `Category` carries no bucket field, and
 * the usage stats are Phase 3 (Ledger) data this screen was never given.
 * Trimmed to a single ordered list — the one shape the real domain supports —
 * rather than inventing either.
 */
export function CategoriesScreen() {
  const t = useTranslations('categories.screen')

  const categories = useCatalogStore((state) => state.categories)
  const createCategory = useCatalogStore((state) => state.createCategory)
  const updateCategory = useCatalogStore((state) => state.updateCategory)
  const deleteCategory = useCatalogStore((state) => state.deleteCategory)
  const reorderCategories = useCatalogStore((state) => state.reorderCategories)
  const defaults = useDefaultCategoryLabels()

  const [formTarget, setFormTarget] = useState<Category | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [nameErrorKind, setNameErrorKind] = useState<CategoryNameErrorKind>()
  const newCategoryButtonRef = useRef<HTMLButtonElement>(null)

  // Deleting a category unmounts its row synchronously — the same click that
  // confirms the AlertDialog removes the trigger button Radix would otherwise
  // restore focus to on close, so focus silently falls back to <body>. Kept
  // across the close so the dialog's own text does not go blank mid-exit-
  // animation either (deleteTarget itself goes null the instant confirm
  // fires, well before the ~200ms close transition finishes).
  const lastDeleteTargetRef = useRef<Category | null>(null)
  if (deleteTarget) lastDeleteTargetRef.current = deleteTarget
  const deleteTargetForDisplay = deleteTarget ?? lastDeleteTargetRef.current

  // Already in visual order (`order` field), never re-sorted here — P-09:
  // sorting a value read straight from a store selector sorts the store.
  const ids = categories.map((category) => category.id)
  const drag = useDragReorder<CategoryId>(ids, reorderCategories)

  function openCreate() {
    setNameErrorKind(undefined)
    setFormTarget('new')
  }

  function openEdit(category: Category) {
    setNameErrorKind(undefined)
    setFormTarget(category)
  }

  function handleSubmit(values: CategoryFormValues) {
    try {
      if (formTarget === 'new') {
        createCategory(values.name, { color: values.color, icon: values.icon })
      } else if (formTarget) {
        updateCategory(formTarget.id, {
          customLabel: values.name,
          color: values.color,
          icon: values.icon,
        })
      }
      setFormTarget(null)
    } catch (error) {
      if (error instanceof DuplicateCategoryIdError) setNameErrorKind('taken')
      else if (error instanceof InvalidCategoryIdError) setNameErrorKind('invalid')
      else throw error
    }
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteCategory(deleteTarget.id)
    setDeleteTarget(null)
    // The row (and its edit/delete buttons) that triggered this dialog is
    // already gone by the time Radix's own close-focus handling runs, so its
    // default restore-to-trigger silently drops to <body> — DeleteCategoryDialog
    // prevents that default, but Radix's FocusScope teardown still blurs
    // whatever is focused as part of unmounting the dialog, in the same tick.
    // Deferred one macrotask so this call is the one that lands last.
    setTimeout(() => newCategoryButtonRef.current?.focus(), 0)
  }

  return (
    <div className="flex flex-col gap-5" data-testid="categories-screen">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-title font-extrabold tracking-tight text-foreground">
            {t('title')}
          </h2>
          <p className="text-body text-foreground-muted">
            {t('subtitle', { count: categories.length })}
          </p>
        </div>

        <Button
          ref={newCategoryButtonRef}
          type="button"
          size="default"
          data-testid="category-new"
          onClick={openCreate}
        >
          <Plus aria-hidden className="size-icon-sm" />
          {t('new')}
        </Button>
      </div>

      <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-2 shadow-sm">
        {categories.map((category) => {
          const label = categoryLabel(category, defaults)
          return (
            <CategoryRow
              key={category.id}
              category={category}
              label={label}
              isDragging={drag.draggingId === category.id}
              onEdit={() => openEdit(category)}
              onDelete={() => setDeleteTarget(category)}
              onDragStart={(event) => drag.handleDragStart(event, category.id)}
              onDragEnd={drag.handleDragEnd}
              onDragOver={(event) => drag.handleDragOver(event, category.id)}
              onDrop={drag.handleDrop}
              onKeyDown={(event) => drag.handleKeyDown(event, category.id)}
            />
          )
        })}
      </div>

      <CategoryFormDialog
        key={formTarget === 'new' || formTarget === null ? 'new' : formTarget.id}
        open={formTarget !== null}
        onOpenChange={(open) => {
          if (!open) setFormTarget(null)
        }}
        mode={formTarget === 'new' || formTarget === null ? 'create' : 'edit'}
        initialValues={
          formTarget && formTarget !== 'new'
            ? {
                name: categoryLabel(formTarget, defaults),
                color: formTarget.color,
                icon: formTarget.icon,
              }
            : BLANK_CATEGORY
        }
        nameErrorKind={nameErrorKind}
        onSubmit={handleSubmit}
      />

      <DeleteCategoryDialog
        categoryName={deleteTargetForDisplay ? categoryLabel(deleteTargetForDisplay, defaults) : ''}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
