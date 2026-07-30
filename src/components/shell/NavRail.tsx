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
    <nav className="nav-rail" data-testid="nav-rail" aria-label={labels.navigation}>
      <div className="nav-rail__brand">
        <NagiMark />
        <NagiWordmark />
      </div>

      <p className="nav-rail__eyebrow">{labels.navigation}</p>

      <ul className="nav-rail__list">
        {DESTINATIONS.map((destination) => (
          <li key={destination.id}>
            <Link
              to={destination.to}
              params={paramsFor(destination)}
              className="nav-rail__link"
              data-testid={`nav-link-${destination.id}`}
              aria-current={destination.id === activeId ? 'page' : undefined}
            >
              <destination.icon aria-hidden />
              {labels[destination.id]}
            </Link>
          </li>
        ))}
      </ul>

      <div className="nav-rail__footer">
        <Link
          to={PROFILE_DESTINATION.to}
          className="nav-rail__profile"
          data-testid="nav-link-profile"
          aria-current={PROFILE_DESTINATION.id === activeId ? 'page' : undefined}
        >
          {labels.profile}
        </Link>
        <ThemeToggle resolved={resolvedTheme} />
      </div>
    </nav>
  )
}
