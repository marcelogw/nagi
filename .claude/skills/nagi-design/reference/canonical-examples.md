# Canonical examples

Two shapes to copy from: a field, and a destructive confirmation. Between them
they carry every rule that is easy to get wrong — money as `Cents`, strings from
the catalogue, semantic tokens, a labelled control, and delete in red behind a
confirmation.

They are **reference, not modules**. Nothing imports them and nothing builds
them; they show the shape a real component takes in `src/`. Where one names a
file that does not exist yet, that is the file the feature has to create.

---

## A form field — `AmountField`

A money input. The three things it gets right: the value crossing its boundary
is always `Cents`, the parse lives in the domain layer with a test, and every
string comes from the catalogue.

```tsx
// src/components/transactions/AmountField.tsx
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { parseAmount } from '@/domain/money'
import { useFormatters } from '@/i18n/formatters'
import type { Cents } from '@/domain/money'

type AmountFieldProps = {
  value: Cents
  onChange: (value: Cents) => void
  error?: string
  testId?: string
}

/**
 * The amount input, in integer cents on both sides of its boundary.
 *
 * It holds the raw text the user is typing rather than a formatted value:
 * reformatting mid-keystroke moves the caret, and a field that fights the
 * person filling it in is the reason people abandon a form. The formatted
 * amount appears once the field is left, through `useFormatters()`.
 *
 * `parseAmount` is deliberately not inline — separators differ by locale, and
 * that is branching logic, which belongs in `src/domain/` with a test.
 */
export function AmountField({ value, onChange, error, testId = 'amount' }: AmountFieldProps) {
  const t = useTranslations('transaction')
  const format = useFormatters()
  const errorId = `${testId}-error`

  // Null means "not being edited", so the field shows the formatted amount.
  // While it holds a string, that string is exactly what was typed.
  const [typed, setTyped] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-2">
      <label className="text-body font-medium text-foreground-muted" htmlFor={testId}>
        {t('amount')}
      </label>

      <input
        id={testId}
        data-testid={testId}
        // Money is right-aligned on tabular figures (`numeric`, globals.css) so
        // columns of it compare at a glance — the same rule that governs every
        // amount on a list row.
        className="rounded-md border border-input bg-surface px-4 py-3 text-right text-body numeric text-foreground transition-colors duration-fast ease-settle hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-invalid:border-danger motion-reduce:transition-none"
        inputMode="decimal"
        value={typed ?? format.currency(value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          setTyped(event.target.value)
          onChange(parseAmount(event.target.value))
        }}
        onBlur={() => setTyped(null)}
      />

      {error ? (
        <p className="text-body text-danger" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
```

**What to carry over.** `Cents` in and `Cents` out — a component never holds a
float or a formatted string. Parsing and validation go to `src/domain/`, which
is written test-first. Labels are real `<label for>` elements, and the error is
tied to the input with `aria-describedby` so a screen reader reaches it.
Hover, focus and the invalid state are all declared, all from tokens —
`aria-invalid:` is a built-in Tailwind variant, not a hand-rolled one.

---

## A destructive confirmation — `DeleteCategoryDialog`

Delete never happens on first click, and it is red. Coral is not available here,
whatever the surrounding screen looks like.

The primitive comes from the shadcn CLI — `npx shadcn add alert-dialog` — and is
never hand-written; `src/components/ui/` is generated, and a hand-edited file
there is overwritten by the next add or quietly diverges from it. Radix supplies
the focus trap, the restore on close, and the escape key. `AlertDialogContent`
already carries the surface, radius, shadow, padding and gap this dialog needs
— composing over it, not restyling it, is the point.

```tsx
// src/components/categories/DeleteCategoryDialog.tsx
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
 * Confirmation for deleting a category.
 *
 * The name is interpolated into the sentence rather than concatenated onto it:
 * word order is a property of the language, and a sentence assembled from
 * fragments is one that cannot be translated.
 *
 * Cancel is the wider target and comes first, which is the calmer default when
 * the other button is irreversible; both buttons take `size="lg"` for a 40px
 * target, above the dialog's own 36px default.
 *
 * The title overrides the primitive's default `text-lg` down to `text-body`:
 * a confirm dialog asks a question rather than opening a screen, and one step
 * below a modal's title is how that reads. Emphasis stays on weight (the
 * primitive's own `font-semibold`), never on size.
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
```

```json
// src/i18n/messages/en.json — and the same keys in every other catalogue
{
  "categories": {
    "delete": {
      "title": "Delete this category?",
      "body": "{name} will be removed. Transactions already using it keep their history.",
      "cancel": "Keep it",
      "confirm": "Delete"
    }
  }
}
```

**What to carry over.** The primitive comes from the CLI; you compose over it.
Delete confirms, always, and wears `--danger` (`variant="destructive"`).
Interpolate values into a sentence, never concatenate around them. Targets are
at least 40px. Every key added lands in every catalogue in the same change —
one locale on its own fails the build.

Both examples need a render test that opens them: Radix enforces invariants
TypeScript cannot see, and only rendering surfaces them.
