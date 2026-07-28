import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'use-intl'
import type { ResolvedTheme } from '@/lib/theme'
import { useSettingsStore } from '@/stores/settings-store'

/**
 * The theme control in the rail's footer.
 *
 * It shows the theme you would get by pressing it, and switches to the opposite
 * of what is currently on screen. That is the answer to the one case the design
 * leaves open: a two-state button while the stored preference has three. From
 * `system`, pressing it commits to the opposite of whatever the OS was giving
 * you — the same thing the button appears to promise in the other two states.
 *
 * Choosing `system` again lives on the Profile screen, where the design puts a
 * three-option control (Light · Dark · System).
 *
 * Rendered twice, because the rail it normally lives in is gone below 960px and
 * the Profile screen that would otherwise carry the setting does not exist yet.
 * A theme the user cannot change on a phone is a theme they do not have.
 */
export function ThemeToggle({
  resolved,
  testId = 'theme-toggle',
}: {
  resolved: ResolvedTheme
  testId?: string
}) {
  const t = useTranslations('theme')
  const setTheme = useSettingsStore((state) => state.setTheme)
  const next = resolved === 'dark' ? 'light' : 'dark'
  const Icon = resolved === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      className="theme-toggle"
      data-testid={testId}
      aria-label={t('toggle')}
      onClick={() => {
        setTheme(next)
      }}
    >
      {/* Sized by the stylesheet from --icon-sm: an SVG width attribute cannot
          hold a custom property, so the token would have to be duplicated as a
          number here to be used at all. */}
      <Icon aria-hidden />
    </button>
  )
}
