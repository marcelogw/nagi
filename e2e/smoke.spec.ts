import { expect, test, type Page } from '@playwright/test'

/**
 * The end-to-end smoke test: the app boots, the shell renders, the routes
 * navigate. One primary flow and the handful of things that break silently
 * around it — not a regression suite.
 *
 * Every selector here is a `data-testid`. Not a preference: the predecessor's
 * end-to-end suite was written against user-visible text, broke the moment the
 * copy moved into message files, and was skipped rather than fixed — where it
 * went on looking exactly like coverage (P-23). A testid survives translation,
 * a rewording and a redesign, which is the whole reason it is worth adding to
 * the markup.
 */

/** Which screen the router settled on, independent of copy and of the URL. */
async function expectRoute(page: Page, route: string) {
  await expect(page.getByTestId('route-placeholder')).toHaveAttribute('data-route', route)
}

test('boots, renders the shell, and `/` lands on the dashboard', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('app-shell')).toBeVisible()
  await expect(page.getByTestId('nav-rail')).toBeVisible()
  await expect(page.getByTestId('theme-toggle')).toBeVisible()
  await expectRoute(page, 'dashboard')
})

test('the rail navigates, and back/forward retrace it', async ({ page }) => {
  await page.goto('/')

  // Scoped to the rail: every destination has a testid in the rail *and* in the
  // tab bar, so the same query against the page matches two elements.
  const rail = page.getByTestId('nav-rail')

  await rail.getByTestId('nav-link-months').click()
  await expectRoute(page, 'month')

  await rail.getByTestId('nav-link-goals').click()
  await expectRoute(page, 'goals')

  await page.goBack()
  await expectRoute(page, 'month')

  await page.goForward()
  await expectRoute(page, 'goals')
})

test('a deep link lands on the screen, and a reload stays on it', async ({ page }) => {
  // /goals: the one destination still a RoutePlaceholder (#126/#127 built
  // /categories and /cards into real screens; see the route tree in
  // src/router.tsx). This test only cares that the router settles on the
  // requested route across a fresh load and a reload, not what's on it.
  await page.goto('/goals')
  await expectRoute(page, 'goals')

  await page.reload()
  await expectRoute(page, 'goals')
  await expect(page.getByTestId('app-shell')).toBeVisible()
})

test('the rail gives way to the tab bar below 960px', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('nav-rail')).toBeVisible()
  await expect(page.getByTestId('tab-bar')).toBeHidden()

  await page.setViewportSize({ width: 390, height: 844 })

  const tabBar = page.getByTestId('tab-bar')
  await expect(tabBar).toBeVisible()
  await expect(page.getByTestId('nav-rail')).toBeHidden()

  // The tab bar is navigation, not decoration — it gets driven, not just seen.
  // /goals rather than /cards: still a RoutePlaceholder, see the comment above.
  await tabBar.getByTestId('nav-link-goals').click()
  await expectRoute(page, 'goals')
})

test('the theme stays reachable when the rail goes', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('theme-toggle')).toBeVisible()
  await expect(page.getByTestId('theme-toggle-compact')).toBeHidden()

  await page.setViewportSize({ width: 390, height: 844 })

  // The check the previous test was missing. Asserting the rail is hidden says
  // nothing about what was inside it, and the theme control was inside it: for
  // one commit it existed, passed every test, and could not be reached on a
  // phone at all.
  await expect(page.getByTestId('theme-toggle')).toBeHidden()
  const toggle = page.getByTestId('theme-toggle-compact')
  await expect(toggle).toBeVisible()

  // A thumb, not a pointer. The design's floor for anything tappable.
  const box = await toggle.boundingBox()
  expect(box?.width).toBeGreaterThanOrEqual(44)
  expect(box?.height).toBeGreaterThanOrEqual(44)

  await toggle.click()
  await expect(page.locator('html')).toHaveClass(/dark/)
})
