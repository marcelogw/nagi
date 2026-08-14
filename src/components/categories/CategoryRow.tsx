import { GripVertical, SquarePen, Trash2 } from 'lucide-react'
import type { DragEvent, KeyboardEvent } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '@/components/ui/button'
import type { Category } from '@/domain/entities'
import { resolveIcon } from '@/lib/resolve-icon'

type CategoryRowProps = {
  category: Category
  label: string
  onEdit: () => void
  onDelete: () => void
  isDragging: boolean
  onDragStart: (event: DragEvent) => void
  onDragEnd: () => void
  onDragOver: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
  onKeyDown: (event: KeyboardEvent) => void
}

/**
 * One row in the categories list — the icon tile and name from
 * `categorias.card.html`'s row, trimmed of the usage/count column: that
 * reads from the ledger's transactions, which is Phase 3 scope this screen
 * does not have.
 *
 * The whole row is the drop target (`onDragOver`/`onDrop`), but only the
 * grip is the drag source and the keyboard handle — a row that starts a
 * native drag from anywhere would fight a screen reader's own navigation
 * inside it.
 */
export function CategoryRow({
  category,
  label,
  onEdit,
  onDelete,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onKeyDown,
}: CategoryRowProps) {
  const t = useTranslations('categories.row')
  const Icon = category.icon ? resolveIcon(category.icon) : undefined

  return (
    <div
      className="group relative flex items-center gap-3 rounded-sm px-2 py-2 transition-colors duration-fast ease-settle hover:bg-surface-muted focus-within:bg-surface-muted data-dragging:opacity-50"
      data-testid={`category-row-${category.id}`}
      data-dragging={isDragging || undefined}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        type="button"
        draggable
        aria-label={t('reorder', { name: label })}
        data-testid={`category-reorder-${category.id}`}
        className="flex size-icon-sm shrink-0 cursor-grab items-center justify-center rounded-sm text-foreground-subtle opacity-0 transition-opacity duration-fast ease-settle hover:bg-surface hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring group-hover:opacity-100 group-focus-within:opacity-100 active:cursor-grabbing pointer-coarse:opacity-100"
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onKeyDown={onKeyDown}
      >
        <GripVertical aria-hidden className="size-icon-xs" />
      </button>

      <span
        aria-hidden
        className="flex size-icon-tile shrink-0 items-center justify-center rounded-sm"
        style={{ background: `color-mix(in oklab, ${category.color} 16%, var(--surface))` }}
      >
        {Icon ? (
          <Icon aria-hidden className="size-icon-md" style={{ color: category.color }} />
        ) : null}
      </span>

      <span className="min-w-0 flex-1 truncate text-body font-semibold text-foreground">
        {label}
      </span>

      {!category.isSystem ? (
        <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity duration-fast ease-settle group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('edit', { name: label })}
            data-testid={`category-edit-${category.id}`}
            onClick={onEdit}
          >
            <SquarePen aria-hidden className="size-icon-sm" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('delete', { name: label })}
            data-testid={`category-delete-${category.id}`}
            className="hover:bg-danger-tint hover:text-danger-text"
            onClick={onDelete}
          >
            <Trash2 aria-hidden className="size-icon-sm" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
