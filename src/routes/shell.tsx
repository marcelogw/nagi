import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import '@/components/shell/shell.css'
import {
  activeDestinationId,
  PROFILE_DESTINATION,
  useDestinationLabels,
} from '@/components/shell/destinations'
import { NagiWordmark } from '@/components/shell/NagiMark'
import { NavRail } from '@/components/shell/NavRail'
import { TabBar } from '@/components/shell/TabBar'
import { ThemeToggle } from '@/components/shell/ThemeToggle'
import { useAppliedTheme } from '@/lib/use-theme'

/**
 * The house the app lives in.
 *
 * The shell is stable: it never animates, and navigating does not move it. Only
 * the content region cross-fades and rises, which is what the `key` on `<main>`
 * is for — "a casa fica, o mês muda".
 */
export function ShellRoute() {
  const resolvedTheme = useAppliedTheme()
  const labels = useDestinationLabels()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeId = activeDestinationId(pathname)

  return (
    <div className="app-shell" data-testid="app-shell">
      <NavRail activeId={activeId} resolvedTheme={resolvedTheme} />

      <div className="app-shell__column">
        <header className="app-header">
          <span className="app-header__brand">
            <NagiWordmark />
          </span>

          <h1 className="app-header__title" data-testid="app-header-title">
            {activeId ? labels[activeId] : null}
          </h1>

          <Link
            to={PROFILE_DESTINATION.to}
            className="app-header__profile"
            data-testid="header-profile"
          >
            {labels.profile}
          </Link>

          <ThemeToggle
            resolved={resolvedTheme}
            className="theme-toggle app-header__theme"
            testId="theme-toggle-compact"
          />
        </header>

        <main key={pathname} className="app-shell__main">
          <Outlet />
        </main>
      </div>

      <TabBar activeId={activeId} />
    </div>
  )
}
