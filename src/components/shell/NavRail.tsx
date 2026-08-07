import { Link } from '@tanstack/react-router'
import type { ResolvedTheme } from '@/lib/theme'
import { DESTINATIONS, paramsFor, PROFILE_DESTINATION, useDestinationLabels } from './destinations'
import { NagiMark, NagiWordmark } from './NagiMark'
import { ThemeToggle } from './ThemeToggle'

interface NavRailProps {
  activeId: string | undefined
  resolvedTheme: ResolvedTheme
}

/**
 * The desktop side navigation: brand at the top, destinations in the middle,
 * profile and theme in the footer.
 *
 * The footer carries no avatar or name because there is no account yet — the
 * design marks that block as a placeholder until one exists, and inventing a
 * person to fill it would put fake data on every screen in the app.
 */
export function NavRail({ activeId, resolvedTheme }: NavRailProps) {
  const labels = useDestinationLabels()

  return (
    <nav
      className="hidden min-h-svh w-52 flex-none flex-col gap-6 border-r border-border bg-surface px-3 py-4 wide:flex"
      data-testid="nav-rail"
      aria-label={labels.navigation}
    >
      {/* The rule under the wordmark is the water-line, not a plain border: it
          is the first place on the screen and the one that repeats most, which
          is where a brand asset earns memory. */}
      <div className="waterline-under flex items-center gap-3 px-2 pb-4">
        <NagiMark />
        <NagiWordmark className="text-title" />
      </div>

      {/* The Label role. It used to pull IBM Plex Mono for this one line — a
          whole third family downloaded to say "NAVIGATION" in a rail. */}
      <p className="-mt-3 px-3 text-label font-semibold uppercase tracking-caps text-foreground-subtle">
        {labels.navigation}
      </p>

      <ul className="flex flex-1 flex-col gap-1">
        {DESTINATIONS.map((destination) => (
          <li key={destination.id}>
            <Link
              to={destination.to}
              params={paramsFor(destination)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-body font-medium text-foreground-muted transition-colors duration-fast ease-settle hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none current-page:bg-primary-tint current-page:font-semibold current-page:text-primary-text"
              data-testid={`nav-link-${destination.id}`}
              aria-current={destination.id === activeId ? 'page' : undefined}
            >
              <destination.icon aria-hidden className="size-icon-md shrink-0" />
              {labels[destination.id]}
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 border-t border-border p-2">
        {/* Not text-primary: this link takes --surface-muted on hover (4,16:1)
            and --primary-tint when active (4,17:1). Both fail AA. */}
        <Link
          to={PROFILE_DESTINATION.to}
          className="min-w-0 flex-1 rounded-sm px-2 py-1 text-body font-medium text-primary-text transition-colors duration-fast ease-settle hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none current-page:bg-primary-tint current-page:font-semibold"
          data-testid="nav-link-profile"
          aria-current={PROFILE_DESTINATION.id === activeId ? 'page' : undefined}
        >
          {labels.profile}
        </Link>
        <ThemeToggle resolved={resolvedTheme} className="size-7" />
      </div>
    </nav>
  )
}
