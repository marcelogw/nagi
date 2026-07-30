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
    <nav className="tab-bar" data-testid="tab-bar" aria-label={labels.navigation}>
      {DESTINATIONS.map((destination) => (
        <Link
          key={destination.id}
          to={destination.to}
          params={paramsFor(destination)}
          className="tab-bar__link"
          data-testid={`nav-link-${destination.id}`}
          aria-current={destination.id === activeId ? 'page' : undefined}
        >
          <destination.icon aria-hidden />
          <span className="tab-bar__label">
            {destination.id === 'months' ? labels.monthsShort : labels[destination.id]}
          </span>
        </Link>
      ))}
    </nav>
  )
}
