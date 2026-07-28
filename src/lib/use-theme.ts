import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/stores/settings-store'
import { applyResolvedTheme, resolveTheme, systemPrefersDark, watchSystemTheme } from './theme'
import type { ResolvedTheme } from './theme'

/**
 * Keep the document in the theme the store asks for, and report which one that
 * turned out to be.
 *
 * Mounted once, at the shell. It renders nothing and gates nothing — the
 * blocking script in `index.html` already put the right class on the document
 * before React existed, so this only handles what happens afterwards: the user
 * picking a theme, and the OS flipping while `system` is selected.
 *
 * The resolved value is returned because the theme control has to show what is
 * on screen, and `system` alone does not say which that is.
 */
export function useAppliedTheme(): ResolvedTheme {
  const theme = useSettingsStore((state) => state.theme)
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark)

  // Subscribed unconditionally rather than only under `system`: the listener
  // costs nothing, and an explicit theme that is later set back to `system`
  // would otherwise be reading a preference that went stale while it was off.
  useEffect(
    () =>
      watchSystemTheme(() => {
        setPrefersDark(systemPrefersDark())
      }),
    [],
  )

  const resolved = resolveTheme(theme, prefersDark)

  useEffect(() => {
    applyResolvedTheme(resolved)
  }, [resolved])

  return resolved
}
