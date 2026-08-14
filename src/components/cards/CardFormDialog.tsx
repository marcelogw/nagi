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
import type { HexColor } from '@/domain/entities'
import { parseAmount, type Cents } from '@/domain/money'
import { useFormatters } from '@/i18n/formatters'
import { CARD_COLOR_SWATCHES } from './cardColors'

export type CardFormValues = { name: string; color: HexColor; limit: Cents | null }

const FORM_ID = 'card-form'

/**
 * Create/edit card — name, colour, and an optional spending limit. Trimmed
 * from `cartoes.card.html`'s modal: `CreditCard` (`domain/entities.ts`) only
 * has `id`/`name`/`color`/`limit`/`order`. The mockup's brand chip, last-4
 * digits, owner and billing-cycle disclosure ("Adicionar detalhes") have no
 * domain field to hold them — trimmed, not invented. See the PR description.
 */
export function CardFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialValues: CardFormValues
  onSubmit: (values: CardFormValues) => void
}) {
  const t = useTranslations('cards.form')
  const format = useFormatters()
  const [name, setName] = useState(initialValues.name)
  const [color, setColor] = useState(initialValues.color)
  const [limit, setLimit] = useState(initialValues.limit)
  // Null means "not being edited" — the field then shows `limit` formatted.
  // While it holds a string, that string is exactly what was typed, same
  // rule as the canonical AmountField (nagi-design/reference).
  const [typedLimit, setTypedLimit] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(initialValues.name)
    setColor(initialValues.color)
    setLimit(initialValues.limit)
    setTypedLimit(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const trimmedName = name.trim()
  const limitDisplay = typedLimit ?? (limit !== null ? format.currency(limit) : '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (trimmedName === '') return
    onSubmit({ name: trimmedName, color, limit })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="card-form-dialog">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-8 w-11 shrink-0 items-center justify-center rounded-sm border border-border"
            style={{
              background: `color-mix(in oklab, ${color} 12%, var(--surface))`,
              borderColor: `color-mix(in oklab, ${color} 30%, var(--surface))`,
            }}
          />
          <DialogTitle className="text-subhead">
            {mode === 'create' ? t('createTitle') : t('editTitle')}
          </DialogTitle>
        </div>

        <DialogDescription className="sr-only">{t('description')}</DialogDescription>

        <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-caption font-semibold text-foreground-muted" htmlFor="card-name">
              {t('nameLabel')}
            </label>
            <input
              id="card-name"
              data-testid="card-name"
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-foreground transition-colors duration-fast ease-settle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring motion-reduce:transition-none"
              value={name}
              placeholder={t('namePlaceholder')}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-caption font-semibold text-foreground-muted">
              {t('colorLabel')}
            </span>
            <ColorPicker
              colors={CARD_COLOR_SWATCHES}
              value={color}
              onChange={setColor}
              label={t('colorLabel')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="text-caption font-semibold text-foreground-muted"
              htmlFor="card-limit"
            >
              {t('limitLabel')}{' '}
              <span className="font-regular text-foreground-subtle">
                {`(${t('limitOptionalHint')})`}
              </span>
            </label>
            <input
              id="card-limit"
              data-testid="card-limit"
              inputMode="decimal"
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-right text-body numeric text-foreground transition-colors duration-fast ease-settle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring motion-reduce:transition-none"
              value={limitDisplay}
              placeholder={t('limitPlaceholder')}
              onChange={(event) => {
                const raw = event.target.value
                setTypedLimit(raw)
                setLimit(raw.trim() === '' ? null : parseAmount(raw))
              }}
              onBlur={() => setTypedLimit(null)}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            data-testid="card-form-cancel"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            disabled={trimmedName === ''}
            data-testid="card-form-submit"
          >
            {mode === 'create' ? t('create') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
