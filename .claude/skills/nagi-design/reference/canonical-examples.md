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

  return (
    <div className="field">
      <label className="field__label" htmlFor={testId}>
        {t('amount')}
      </label>

      <input
        id={testId}
        data-testid={testId}
        className="field__input field__input--amount"
        inputMode="decimal"
        defaultValue={format.currency(value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          onChange(parseAmount(event.target.value))
        }}
      />

      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
```

```css
/* src/components/transactions/transactions.css */
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground-muted);
}

.field__input {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--input);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  transition: border-color var(--duration-fast) var(--ease-standard);
}

/* Money is right-aligned on tabular numerals so columns of it compare at a
   glance — the same rule that governs every amount on a list row. */
.field__input--amount {
  text-align: right;
  font-family: var(--font-mono);
  font-feature-settings: var(--numeric-features);
}

.field__input:hover {
  border-color: var(--border-strong);
}

.field__input:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}

.field__input[aria-invalid='true'] {
  border-color: var(--danger);
}

.field__error {
  font-size: var(--text-sm);
  color: var(--danger);
}
```

**What to carry over.** `Cents` in and `Cents` out — a component never holds a
float or a formatted string. Parsing and validation go to `src/domain/`, which
is written test-first. Labels are real `<label for>` elements, and the error is
tied to the input with `aria-describedby` so a screen reader reaches it.
Hover, focus and the invalid state are all declared, all from tokens.

---

## A destructive confirmation — `DeleteCategoryDialog`

Delete never happens on first click, and it is red. Coral is not available here,
whatever the surrounding screen looks like.

The primitive comes from the shadcn CLI — `npx shadcn add alert-dialog` — and is
never hand-written; `src/components/ui/` is generated, and a hand-edited file
there is overwritten by the next add or quietly diverges from it. Radix supplies
the focus trap, the restore on close, and the escape key.

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
 * the other button is irreversible.
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
      <AlertDialogContent className="confirm">
        <AlertDialogTitle className="confirm__title">{t('title')}</AlertDialogTitle>

        <AlertDialogDescription className="confirm__body">
          {t('body', { name: categoryName })}
        </AlertDialogDescription>

        <AlertDialogFooter className="confirm__footer">
          <AlertDialogCancel data-testid="delete-category-cancel">
            {t('cancel')}
          </AlertDialogCancel>

          <AlertDialogAction
            className="confirm__action confirm__action--danger"
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

```css
/* src/components/categories/categories.css */
.confirm {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* A confirm dialog's title is --text-md, one step below a modal's: it is a
   question, not a screen. Emphasis comes from weight, never from size. */
.confirm__title {
  font-family: var(--font-heading);
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--foreground);
}

.confirm__body {
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--foreground-muted);
  text-wrap: pretty;
}

.confirm__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.confirm__action {
  min-height: 40px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  transition: background-color var(--duration-fast) var(--ease-standard);
}

.confirm__action--danger {
  background: var(--danger);
  color: var(--danger-foreground);
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
Delete confirms, always, and wears `--danger`. Interpolate values into a
sentence, never concatenate around them. Targets are at least 40px. Every key
added lands in every catalogue in the same change — one locale on its own fails
the build.

Both examples need a render test that opens them: Radix enforces invariants
TypeScript cannot see, and only rendering surfaces them.
