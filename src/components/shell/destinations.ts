import { CalendarRange, CreditCard, LayoutDashboard, Tags, Target } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { currentMonth } from '@/domain/month'

/**
 * The top-level destinations, in the order the design puts them.
 *
 * One list, consumed by both the rail and the tab bar: the two are the same
 * navigation at two widths, and a second copy is how they drift apart. Painel
 * and Visão Mensal are siblings of equal weight — neither is primary.
 *
 * `prefix` is what decides the active destination; `to`/`params` are what the
 * link points at. They differ for the month, where every month is the same
 * destination but the link has to name one.
 */
export const DESTINATIONS = [
  { id: 'dashboard', prefix: '/dashboard', to: '/dashboard', icon: LayoutDashboard },
  { id: 'months', prefix: '/months', to: '/months/$month', icon: CalendarRange },
  { id: 'goals', prefix: '/goals', to: '/goals', icon: Target },
  { id: 'categories', prefix: '/categories', to: '/categories', icon: Tags },
  { id: 'cards', prefix: '/cards', to: '/cards', icon: CreditCard },
] as const

/** Sits in the rail's footer rather than the list, which is where the design puts it. */
export const PROFILE_DESTINATION = { id: 'profile', prefix: '/settings', to: '/settings' } as const

export type DestinationId = (typeof DESTINATIONS)[number]['id'] | (typeof PROFILE_DESTINATION)['id']

/**
 * The params a destination's link needs. Only the month has any, and it points
 * at today — a destination is where you go when you have not chosen a month.
 */
export function paramsFor(destination: (typeof DESTINATIONS)[number]) {
  return destination.id === 'months' ? { month: currentMonth() } : {}
}

/**
 * Every navigation label, resolved once for the rail and the tab bar.
 *
 * Spelled out one literal key at a time, rather than looking the catalogue up
 * with a destination id. A key assembled at runtime cannot be resolved by the
 * catalogue check, which then cannot tell a dead key from a live one — the
 * exact blindness that let the predecessor carry a fully translated dashboard
 * that nothing referenced.
 */
export function useDestinationLabels() {
  const t = useTranslations('nav')

  return {
    navigation: t('label'),
    dashboard: t('dashboard'),
    months: t('months'),
    monthsShort: t('monthsShort'),
    goals: t('goals'),
    categories: t('categories'),
    cards: t('cards'),
    profile: t('profile'),
  }
}

/**
 * Which destination a path belongs to, or `undefined` for a path under none.
 *
 * Prefix matching, so `/months/2026-05` and `/goals/abc` keep their destination
 * lit — comparing against the link's own target would only match the one month
 * the link happens to point at.
 */
export function activeDestinationId(pathname: string): DestinationId | undefined {
  const match = [...DESTINATIONS, PROFILE_DESTINATION].find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  return match?.id
}
