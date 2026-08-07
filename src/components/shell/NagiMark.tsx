import { cn } from '@/lib/utils'

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
 * The brand symbol: a wave losing force until the water lies flat. Three
 * oscillations decaying 13 : 8 : 5 (Fibonacci) over gaps that shrink by φ.
 *
 * Geometry frozen 2026-07-30, round 8 — do not adjust by eye. The control
 * points 19.87 / 24.47 / 33.2 / 36.3 were solved numerically so the waterline
 * crossings land on 23.41 / 35.41 / 42.82, which is what makes the ratios come
 * out golden; nudging them breaks the construction and nobody notices for
 * months. Opening the curve further is closed too: past ~2.5 of curvature the
 * drawing reads as the letter R.
 *
 * Monochrome by definition — it takes its colour from whatever contains it, so
 * it needs no dark-mode variant. Coral marks the answer in the product (the
 * balance, the goal) and the wordmark dot beside this, never the symbol.
 */
const MARK_PATH =
  'M4 24C9.4 24 9.4 11 14.6 11C19.87 11 24.47 32 30 32C33.2 32 36.3 19 39.1 19C41.35 19 41.35 24 42.82 24L52 24'

export function NagiMark() {
  return (
    <svg width="34" height="19" viewBox="0 4 56 32" fill="none" role="img" aria-label="Nagi">
      <path
        d={MARK_PATH}
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The wordmark, and the one coral on the screen. Nothing else competes with it.
 *
 * Sized by whichever container it sits in — the rail on desktop, the header
 * below 960px, where the design moves the brand. The size arrives as a class
 * from the call site rather than being read off an ancestor selector: there is
 * no ancestor to read once the shell is utilities, and two call sites naming
 * their own size is what makes a third one an explicit decision.
 */
export function NagiWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline font-heading font-extrabold tracking-tight',
        className,
      )}
      data-testid="wordmark"
    >
      {WORDMARK}
      <span className="text-accent-coral" data-testid="wordmark-dot">
        {WORDMARK_DOT}
      </span>
    </span>
  )
}
