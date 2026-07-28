import en from './messages/en.json'
import ptBR from './messages/pt-BR.json'

// These live outside provider.tsx so that file exports only a component — a
// module mixing the two breaks React Fast Refresh.

/**
 * The message catalogue, shared with the test render wrapper so components
 * under test are fed the same strings the app feeds them. A second copy in test
 * code is a second thing to keep in sync.
 */
export const messages = { en, 'pt-BR': ptBR }

/**
 * The timezone `use-intl` formats dates in.
 *
 * ponytail: UTC is almost certainly wrong — a user in Sao Paulo sees a date
 * formatted hours off — but changing it is a product behaviour change that
 * belongs to the i18n runtime work, not to a test harness. Pinned in one place
 * so that fix is a one-line change and the tests follow it automatically.
 */
export const APP_TIME_ZONE = 'UTC'
