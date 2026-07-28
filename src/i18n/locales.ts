import en from './messages/en.json'
import ptBR from './messages/pt-BR.json'

// These live outside provider.tsx so that file exports only a component — a
// module mixing the two breaks React Fast Refresh.

/**
 * The registered locales, in the order a language picker offers them.
 *
 * A list, not a pair: adding a language is one message file and one entry here,
 * and nothing else in the app names a locale code. `en` comes first because it
 * is the source locale and the fallback.
 */
export const LOCALES = [
  { code: 'en', label: 'English', messages: en },
  { code: 'pt-BR', label: 'Português (Brasil)', messages: ptBR },
] as const

export type Locale = (typeof LOCALES)[number]['code']

const SOURCE_LOCALE = LOCALES[0]

/**
 * The timezone dates are formatted in — the runtime's own.
 *
 * A month is a local calendar unit: `monthToDate` builds the first instant of
 * the month in local time, so formatting it anywhere else moves it across the
 * month boundary and prints the wrong month name. Read once, at module load,
 * because `Intl` resolves the same value on every call anyway.
 */
export const APP_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

const language = (tag: string) => tag.toLowerCase().split('-')[0]

/**
 * The closest registered locale for a list of browser language tags.
 *
 * Takes the list instead of reading `navigator`, so every branch is testable
 * without stubbing a global. The browser has already ranked the tags, so list
 * order decides first; within one tag an exact code beats a shared base
 * language, which is what stops `pt-BR` resolving to a `pt-PT` that happened to
 * be registered earlier.
 */
export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const match =
      LOCALES.find((locale) => locale.code.toLowerCase() === tag.toLowerCase()) ??
      // `pt` and `pt-PT` have no entry of their own and are far closer to
      // `pt-BR` than to English.
      LOCALES.find((locale) => language(locale.code) === language(tag))

    if (match) return match.code
  }

  return SOURCE_LOCALE.code
}

/** `en` is the fallback here too: a persisted code outlives the entry it named. */
export function messagesFor(code: Locale) {
  return (LOCALES.find((locale) => locale.code === code) ?? SOURCE_LOCALE).messages
}
