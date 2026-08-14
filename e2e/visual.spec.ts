import { expect, test, type Page } from '@playwright/test'

/**
 * Visual regression for the app shell — the chrome, not the screens inside it.
 *
 * Scoped to individual chrome elements (header, nav rail/tab bar) rather than
 * a full-page shot with the content region masked: `main` is `position:
 * fixed`'s sibling, and Playwright's `mask` paints an opaque box over the
 * final composited image at the target's bounding rect, ignoring stacking
 * order — masking `main` silently painted over the fixed tab bar too. Per
 * element sidesteps that, and also means no route the design system has
 * closed needs to exist for this to run (every route still renders
 * `RoutePlaceholder`, see #126/#127/#133) — nothing here reads `<main>`.
 *
 * Baselines are committed from a CI-equivalent Linux environment (Playwright's
 * own Docker image), not a local machine — font hinting/antialiasing differs
 * enough between platforms to fail every run on a false positive otherwise.
 */

const VIEWPORTS = [
  // Desktop shows the rail; mobile collapses it into the tab bar (<960px).
  { name: 'desktop', width: 1280, height: 800, chrome: 'nav-rail' },
  { name: 'mobile', width: 390, height: 844, chrome: 'tab-bar' },
] as const

async function waitForFontsReady(page: Page) {
  // `font-display: swap` means the first paint can land on the fallback
  // face; without this, whichever run wins the race against the webfont
  // decides the baseline. A string expression, not a closure: `document`
  // is a DOM global the Node-side tsconfig covering `e2e/` doesn't carry.
  await page.evaluate('document.fonts.ready')
}

for (const viewport of VIEWPORTS) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`shell — ${colorScheme}, ${viewport.name}`, async ({ page }) => {
      // Set before navigation: the theme defaults to `system`, and the
      // blocking script in `index.html` reads this same media query before
      // React ever mounts.
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize(viewport)
      await page.goto('/dashboard')

      await expect(page.getByTestId('app-shell')).toBeVisible()
      await waitForFontsReady(page)

      await expect(page.getByTestId('app-header')).toHaveScreenshot(
        `shell-header-${colorScheme}-${viewport.name}.png`,
      )
      await expect(page.getByTestId(viewport.chrome)).toHaveScreenshot(
        `shell-${viewport.chrome}-${colorScheme}-${viewport.name}.png`,
      )
    })
  }
}
