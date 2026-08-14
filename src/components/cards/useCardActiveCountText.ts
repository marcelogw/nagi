import { useTranslations } from 'use-intl'

/**
 * The "N active installments" plural text, shared between the tile's own
 * caption (`CardActiveCountLabel`) and the detail overlay's `sr-only`
 * description. A standalone hook rather than the JSX label itself: the
 * description needs plain text as a Radix `Description` child, not another
 * nested `<p>`.
 */
export function useCardActiveCountText(count: number): string {
  const t = useTranslations('cards.screen')
  return t('activeInstallments', { count })
}
