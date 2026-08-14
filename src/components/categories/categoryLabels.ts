import { useTranslations } from 'use-intl'
import type { Category } from '@/domain/entities'

/**
 * Every default category's translated label, resolved as one literal `t()`
 * call per id rather than passing `category.id` straight through as the key —
 * the same reason `useDestinationLabels` spells its keys out one at a time
 * (`src/components/shell/destinations.ts`): a key assembled at runtime cannot
 * be checked by `scripts/check-messages.mjs`, and lets a real typo through
 * unseen.
 */
export function useDefaultCategoryLabels(): Record<string, string> {
  const t = useTranslations('categories')

  return {
    housing: t('housing'),
    utilities: t('utilities'),
    education: t('education'),
    subscriptions: t('subscriptions'),
    groceries: t('groceries'),
    food: t('food'),
    transport: t('transport'),
    health: t('health'),
    leisure: t('leisure'),
    electronics: t('electronics'),
    courses: t('courses'),
    other: t('other'),
  }
}

/** `category.customLabel` wins; otherwise the id resolves through the default label map — the dual-label rule (`entities.ts`). */
export function categoryLabel(category: Category, defaults: Record<string, string>): string {
  return category.customLabel ?? defaults[category.id] ?? category.id
}

/**
 * The curated 8-swatch palette the colour picker offers — screen-owned by
 * design (`ColorPicker`'s own contract: "categories and cards each ship their
 * own list in their own mockup"), and happens to equal the domain's own
 * seeding cycle for the 11 defaults (`DEFAULT_CATEGORY_COLOR_CYCLE`).
 */
export const CATEGORY_COLOR_SWATCHES = [
  'oklch(0.64 0.10 168)',
  'oklch(0.62 0.10 250)',
  'oklch(0.62 0.11 285)',
  'oklch(0.64 0.10 210)',
  'oklch(0.64 0.11 25)',
  'oklch(0.63 0.10 95)',
  'oklch(0.62 0.11 300)',
  'oklch(0.63 0.11 350)',
]

/** The curated icon library for categories, from `categorias.card.html`. `home` is remapped to `house` — lucide-react 1.27 renamed it. */
export const CATEGORY_ICON_CHOICES = [
  'tag',
  'shopping-cart',
  'house',
  'utensils',
  'coffee',
  'fuel',
  'car',
  'bus',
  'plug-zap',
  'wifi',
  'credit-card',
  'briefcase',
  'gift',
  'piggy-bank',
  'landmark',
  'heart-pulse',
  'pill',
  'graduation-cap',
  'plane',
  'shirt',
  'dumbbell',
  'film',
  'book-open',
  'cat',
]
