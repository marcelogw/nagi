import { Link } from '@tanstack/react-router'
import { DESTINATIONS, paramsFor, useDestinationLabels } from './destinations'

/**
 * The same navigation as the rail, below 960px.
 *
 * Both are always in the DOM and the stylesheet shows one — a CSS breakpoint
 * cannot show the wrong one for a frame, which a width read in JavaScript can.
 *
 * Only the month gets a short label. It is the one destination whose name does
 * not survive a fifth of a phone's width, and a parallel short key for every
 * other destination would be four more strings per language saying the same
 * thing as the ones beside them.
 */
export function TabBar({ activeId }: { activeId: string | undefined }) {
  const labels = useDestinationLabels()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface pb-safe wide:hidden"
      data-testid="tab-bar"
      aria-label={labels.navigation}
    >
      {/* min-h-14 is the touch-target floor. Anything under 44px is a miss on a phone. */}
      {DESTINATIONS.map((destination) => (
        <Link
          key={destination.id}
          to={destination.to}
          params={paramsFor(destination)}
          className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-label font-medium text-foreground-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring current-page:font-semibold current-page:text-primary"
          data-testid={`nav-link-${destination.id}`}
          aria-current={destination.id === activeId ? 'page' : undefined}
        >
          <destination.icon aria-hidden className="size-icon-md shrink-0" />
          <span className="max-w-full truncate">
            {destination.id === 'months' ? labels.monthsShort : labels[destination.id]}
          </span>
        </Link>
      ))}
    </nav>
  )
}
