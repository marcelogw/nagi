import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { ColorPicker } from '@/components/pickers/ColorPicker'
import { IconPicker } from '@/components/pickers/IconPicker'
import type { HexColor } from '@/domain/entities'
import { resolveIcon } from '@/lib/resolve-icon'
import { CATEGORY_COLOR_SWATCHES, CATEGORY_ICON_CHOICES } from './categoryLabels'

export type CategoryFormValues = { name: string; color: HexColor; icon: string | null }

/** Which of the two name-validation messages the catalogue defines, resolved by kind rather than a pre-formatted string, so this file stays the only caller of `useTranslations('categories.form')` a message-catalogue check can trace. */
export type CategoryNameErrorKind = 'taken' | 'invalid'

type CategoryFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialValues: CategoryFormValues
  nameErrorKind?: CategoryNameErrorKind
  onSubmit: (values: CategoryFormValues) => void
}

const FORM_ID = 'category-form'

/**
 * Create/edit category — one Dialog for both modes, following
 * `categorias.card.html`'s single form (name, icon, colour) trimmed to what
 * `Category` actually has: no bucket ("Balde") or expense-subtype field
 * exists on the entity, so neither appears here. See the PR description for
 * why that trim is a domain gap, not an oversight.
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  nameErrorKind,
  onSubmit,
}: CategoryFormDialogProps) {
  const t = useTranslations('categories.form')
  const nameError =
    nameErrorKind === 'taken'
      ? t('nameTaken')
      : nameErrorKind === 'invalid'
        ? t('nameInvalid')
        : undefined
  const [name, setName] = useState(initialValues.name)
  const [color, setColor] = useState(initialValues.color)
  const [icon, setIcon] = useState(initialValues.icon)

  // Re-seeds from `initialValues` every time the dialog opens — covers both
  // "create" (always blank) and "edit" (the target just changed) without a
  // remount, since Radix keeps the tree mounted across open/close.
  useEffect(() => {
    if (!open) return
    setName(initialValues.name)
    setColor(initialValues.color)
    setIcon(initialValues.icon)
    // initialValues is a fresh object every render; only `open` flipping true
    // should reseed the form, not every keystroke the parent re-renders through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const trimmedName = name.trim()
  const Icon = icon ? resolveIcon(icon) : undefined

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (trimmedName === '') return
    onSubmit({ name: trimmedName, color, icon })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="category-form-dialog">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-icon-tile shrink-0 items-center justify-center rounded-sm"
            style={{ background: `color-mix(in oklab, ${color} 16%, var(--surface))` }}
          >
            {Icon ? <Icon aria-hidden className="size-icon-lg" style={{ color }} /> : null}
          </span>
          <DialogTitle className="text-subhead">
            {mode === 'create' ? t('createTitle') : t('editTitle')}
          </DialogTitle>
        </div>

        <DialogDescription className="sr-only">{t('description')}</DialogDescription>

        <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label
              className="text-caption font-semibold text-foreground-muted"
              htmlFor="category-name"
            >
              {t('nameLabel')}
            </label>
            <input
              id="category-name"
              data-testid="category-name"
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-foreground transition-colors duration-fast ease-settle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-invalid:border-danger motion-reduce:transition-none"
              value={name}
              placeholder={t('namePlaceholder')}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'category-name-error' : undefined}
              onChange={(event) => setName(event.target.value)}
            />
            {nameError ? (
              <p className="text-body text-danger" id="category-name-error" role="alert">
                {nameError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-caption font-semibold text-foreground-muted">
              {t('iconLabel')}
            </span>
            <IconPicker
              iconNames={CATEGORY_ICON_CHOICES}
              value={icon ?? ''}
              onChange={setIcon}
              label={t('iconLabel')}
              searchPlaceholder={t('iconSearchPlaceholder')}
              emptyMessage={t('iconEmpty')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-caption font-semibold text-foreground-muted">
              {t('colorLabel')}
            </span>
            <ColorPicker
              colors={CATEGORY_COLOR_SWATCHES}
              value={color}
              onChange={setColor}
              label={t('colorLabel')}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            data-testid="category-form-cancel"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            disabled={trimmedName === ''}
            data-testid="category-form-submit"
          >
            {mode === 'create' ? t('create') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
