import { useId } from 'react'

/**
 * The wordmark, as constants rather than JSX literals.
 *
 * A brand name is not copy: it is not translated, and it must not be reachable
 * from a message file where a well-meaning translation would rename the
 * product. Keeping it out of the linter's allowlist matters too — that list
 * holds glyphs, never words, and one exception is how it stops being curated.
 */
const WORDMARK = 'nagi'
const WORDMARK_DOT = '.'

/**
 * The brand symbol: a disc holding water at rest, with the concave curve of a
 * meniscus. The one hand-drawn curve the design system allows, and it lives
 * only in the identity — UI icons stay Lucide line geometry.
 *
 * No coral in here. Coral appears exactly once on the screen, on the wordmark
 * dot next to this.
 */
export function NagiMark() {
  // Two marks on one page would otherwise share a clip-path id, and the second
  // would silently clip against the first.
  const clipId = useId()

  return (
    <svg width="34" height="34" viewBox="0 0 48 48" fill="none" role="img" aria-label="Nagi">
      <defs>
        <clipPath id={clipId}>
          <circle cx="24" cy="24" r="21" />
        </clipPath>
      </defs>
      <circle cx="24" cy="24" r="21" fill="var(--primary-tint)" />
      <g clipPath={`url(#${clipId})`}>
        <path d="M0 23 Q24 33 48 23 L48 48 L0 48 Z" fill="var(--success)" />
      </g>
      <path
        d="M3 23 Q24 33 45 23"
        fill="none"
        stroke="color-mix(in oklch, var(--success) 65%, var(--foreground))"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="21" fill="none" stroke="var(--primary)" strokeWidth="2.4" />
    </svg>
  )
}

/**
 * The wordmark, and the one coral on the screen. Nothing else competes with it.
 *
 * Sized by whichever container it sits in — the rail on desktop, the header
 * below 960px, where the design moves the brand.
 */
export function NagiWordmark() {
  return (
    <span className="wordmark" data-testid="wordmark">
      {WORDMARK}
      <span className="wordmark__dot" data-testid="wordmark-dot">
        {WORDMARK_DOT}
      </span>
    </span>
  )
}
