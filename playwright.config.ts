import { defineConfig, devices } from '@playwright/test'

// Chromium only, on purpose. This suite exists to prove the app boots, the
// shell renders and the routes navigate — none of which is a browser-engine
// question. Three engines would triple the runtime of every fork's pull
// request to re-answer the same one.
//
// The dev server is started by Playwright itself rather than by a documented
// "run this in another terminal first": a harness with a manual step is a
// harness that gets skipped, and `npm run test:e2e` has to work from a clean
// clone.

const port = 5173
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e',
  // A `.only` left in a spec silently stops running the rest of the file (P-23).
  // `npm run quality` rejects it in the repo; this rejects it in CI as well.
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // 2% tolerance absorbs sub-pixel antialiasing noise between runs without
  // hiding a real layout shift — a masked/moved element changes far more
  // than 2% of the shot.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  projects: [
    {
      name: 'chromium',
      // The desktop breakpoint is the default; the one test that cares about
      // the <960px rail → tab-bar switch resizes itself.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
