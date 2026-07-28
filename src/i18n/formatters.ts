import { useFormatter } from 'use-intl'
import { monthToDate, type Month } from '@/domain/month'
import { useSettingsStore } from '@/stores/settings-store'

/**
 * The app's formatters, with locale and currency already bound.
 *
 * A hook and only a hook, deliberately. The predecessor exported
 * `formatCurrency(value, locale = 'pt-BR')`, and all 36 call sites took the
 * default — the app rendered Brazilian currency to everyone, in every language,
 * and nothing failed. There is no way to reach a formatter here without being
 * inside the provider, so that class of call site cannot be written.
 */
export function useFormatters() {
  const format = useFormatter()
  const currency = useSettingsStore((state) => state.currency)

  return {
    /**
     * Integer cents, the money type — the divide by 100 happens here and only
     * here, at the boundary where a value stops being arithmetic and becomes
     * text. The currency is a setting, not a property of the language.
     */
    currency: (cents: number) => format.number(cents / 100, { style: 'currency', currency }),

    /** The localised month name, via `monthToDate` — never `new Date(month)`. */
    month: (month: Month) =>
      format.dateTime(monthToDate(month), { year: 'numeric', month: 'long' }),
  }
}
