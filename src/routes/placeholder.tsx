/**
 * A route that exists before its screen does.
 *
 * The route tree is built in full up front (ADR-002) so navigation, deep links
 * and back/forward are real from the first phase — but the screens themselves
 * belong to later phases and their design is not this card's to invent. So this
 * renders nothing: an empty region is honestly empty, whereas a "coming soon"
 * card is a screen someone designed by accident.
 *
 * The shell around it still shows which destination is active, and the testid
 * gives the end-to-end navigation test something locale-independent to assert.
 */
export function RoutePlaceholder({ route }: { route: string }) {
  return <div data-testid="route-placeholder" data-route={route} />
}
