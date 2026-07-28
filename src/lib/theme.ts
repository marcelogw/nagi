/**
 * Theme resolution.
 *
 * The stored preference is `light | dark | system`; what the document actually
 * wears is only ever `light | dark`. Those two are different things, so they
 * are different types — `system` is a rule for picking, not a value the
 * stylesheet can use.
 *
 * There is no `mounted` gate anywhere in here. That pattern exists to stop a
 * server render from disagreeing with the client, and this app has no server
 * render (ADR-001). The flash is prevented by the blocking script in
 * `index.html`, which reads the same storage key this module writes.
 */

export const THEMES = ['light', 'dark', 'system'] as const

export type Theme = (typeof THEMES)[number]

/** What the document ends up wearing. `system` is resolved away before this. */
export type ResolvedTheme = 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** The class the token files scope their dark values to. */
const DARK_CLASS = 'dark'

export function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark ? 'dark' : 'light'
  return theme
}

export function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle(DARK_CLASS, resolved === 'dark')
}

/**
 * Call `onChange` when the OS preference flips. Only worth subscribing while
 * the preference is `system` — an explicit choice does not care what the OS
 * thinks.
 */
export function watchSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => {
    query.removeEventListener('change', onChange)
  }
}
