import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settings-store'
import { applyTheme, watchSystemTheme } from './theme'

/**
 * Keep the document in the theme the store says it should be in.
 *
 * Mounted once, at the shell. It renders nothing and gates nothing — the
 * blocking script in `index.html` already put the right class on the document
 * before React existed, so this only has to handle changes: the user picking a
 * theme, and the OS flipping while `system` is selected.
 */
export function useAppliedTheme(): void {
  const theme = useSettingsStore((state) => state.theme)

  useEffect(() => {
    applyTheme(theme)

    // An explicit light or dark does not care what the OS is doing, so there is
    // nothing to listen to.
    if (theme !== 'system') return

    return watchSystemTheme(() => {
      applyTheme(theme)
    })
  }, [theme])
}
