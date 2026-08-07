import { Link, Outlet, useRouterState } from '@tanstack/react-router'
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
    <div className="flex min-h-svh bg-background font-sans text-foreground" data-testid="app-shell">
      <NavRail activeId={activeId} resolvedTheme={resolvedTheme} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border bg-surface px-6 py-4">
          {/* Below the breakpoint the brand moves here, because the rail it
              normally sits in is gone. Both are always in the DOM; the
              breakpoint decides which is shown — a width read in JavaScript can
              show the wrong one for a frame, a media query cannot. */}
          <span className="inline-flex wide:hidden">
            <NagiWordmark className="text-subhead leading-normal" />
          </span>

          {/* The phone header carries the brand, not the screen name — the tab
              bar already says which screen you are on. Hidden rather than
              dropped: a page with no h1 is a page a screen reader cannot
              summarise. leading-normal for the same reason as the rail's
              wordmark: text-title's snug leading would shorten the header. */}
          <h1
            className="sr-only font-heading text-title font-extrabold leading-normal tracking-tight wide:not-sr-only"
            data-testid="app-header-title"
          >
            {activeId ? labels[activeId] : null}
          </h1>

          {/* min-h-11 is the design's phone floor for anything tappable. The
              rail's 28px controls are a pointer target; this is a thumb target.
              Pushed to the trailing edge by its own margin — a spacer element
              would be one more node saying what one property already says. */}
          <Link
            to={PROFILE_DESTINATION.to}
            className="ml-auto inline-flex min-h-11 items-center justify-center rounded-sm px-3 py-1 text-body font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring wide:hidden"
            data-testid="header-profile"
          >
            {labels.profile}
          </Link>

          <ThemeToggle
            resolved={resolvedTheme}
            className="inline-flex size-11 wide:hidden"
            testId="theme-toggle-compact"
          />
        </header>

        {/* pb-16 clears the fixed tab bar so it never covers the end of a list;
            above the breakpoint the bar is gone and the padding is even. */}
        <main
          key={pathname}
          className="flex min-w-0 flex-1 animate-content-enter flex-col gap-5 p-4 pb-16 motion-reduce:animate-none wide:p-6 wide:pb-6"
        >
          <Outlet />
        </main>
      </div>

      <TabBar activeId={activeId} />
    </div>
  )
}
