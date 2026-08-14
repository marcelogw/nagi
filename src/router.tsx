import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  redirect,
} from '@tanstack/react-router'
import { CardsScreen } from './components/cards/CardsScreen'
import { CategoriesScreen } from './components/categories/CategoriesScreen'
import { currentMonth, isMonth } from './domain/month'
import { RoutePlaceholder } from './routes/placeholder'
import { ShellRoute } from './routes/shell'

// The route tree of ADR-002. Every screen is a real URL, and the selected month
// and year are navigation state carried by the URL — never store state. That is
// not a style preference: holding `currentMonth` in a persisted store is what
// made the predecessor materialise twelve empty months just from browsing a
// year (P-06).

const rootRoute = createRootRoute({
  component: ShellRoute,
})

/**
 * The dashboard's only search param.
 *
 * Exported because it is the part with a decision in it, and a plain function
 * is testable without standing up a router — asserting it through the router
 * would mean reaching into the router's private state to find the validated
 * value, which is a test of TanStack rather than of this rule.
 *
 * Junk is dropped rather than thrown: the dashboard has a meaningful default
 * without the param, so erroring a screen that works would be the wrong trade.
 */
export function validateDashboardSearch(search: Record<string, unknown>): { year?: number } {
  const year = Number(search['year'])
  return Number.isInteger(year) && year >= 1000 && year <= 9999 ? { year } : {}
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // A redirect rather than a second component. `/` and `/dashboard` rendering
  // the same screen is how the predecessor ended up with Settings reachable two
  // ways, with two different behaviours.
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  validateSearch: validateDashboardSearch,
  component: () => <RoutePlaceholder route="dashboard" />,
})

const monthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/months/$month',
  // The point of a typed param: `/months/2026-13` and `/months/banana` are
  // decided here, at the boundary, and never reach a selector.
  beforeLoad: ({ params }) => {
    if (!isMonth(params.month)) {
      throw redirect({ to: '/months/$month', params: { month: currentMonth() } })
    }
  },
  component: () => <RoutePlaceholder route="month" />,
})

const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/categories',
  component: CategoriesScreen,
})

const cardsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cards',
  component: CardsScreen,
})

const goalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/goals',
  component: () => <RoutePlaceholder route="goals" />,
})

// A route, not a sheet held in state, so a goal is addressable — someone can be
// linked straight to it.
const goalDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/goals/$goalId',
  component: () => <RoutePlaceholder route="goal-detail" />,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: () => <RoutePlaceholder route="settings" />,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  monthRoute,
  categoriesRoute,
  cardsRoute,
  goalsRoute,
  goalDetailRoute,
  settingsRoute,
])

/**
 * Everything the router is configured with except its history.
 *
 * Exported so the test helper builds the same router the app runs, differing
 * only in where the URL comes from. A test-only configuration would pass while
 * the real one behaved differently.
 */
export const routerOptions = {
  routeTree,
  // Without this an unknown path renders TanStack's built-in "Not Found" — a
  // string from the library, in English regardless of locale, inside the full
  // shell, under an empty `<h1>` because no destination matches. The design
  // defines no 404 screen, so rather than invent one, an unknown path goes
  // where `/` goes. Worth revisiting if the app ever links somewhere it can be
  // wrong about; today nothing links outside this tree.
  defaultNotFoundComponent: () => <Navigate to="/dashboard" replace />,
}

export const router = createRouter(routerOptions)

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
