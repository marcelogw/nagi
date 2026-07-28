/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tests run under a non-UTC timezone on purpose. Parsing a date-only string with
// `new Date('2026-07-01')` yields UTC midnight, which is the previous day here —
// the single defect family that did the most damage in the predecessor app. Under
// UTC that bug is invisible, so the suite has to run somewhere else. São Paulo is
// also the app's primary market. CI sets the same value on the test job.
//
// Set on the parent process so forked test workers inherit it at startup.
process.env.TZ = 'America/Sao_Paulo'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Vitest config lives here rather than in its own file: a separate
  // vitest.config.ts *replaces* this one instead of merging with it, so the
  // `@` alias above had to be repeated and immediately drifted.
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'domain',
          include: ['src/domain/**/*.test.ts'],
          // Node, not jsdom, and deliberately so: `domain/` is pure functions.
          // Without a DOM in scope, a module that reaches for `window` or
          // `document` fails here instead of passing and drifting.
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/domain/**'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**'],
      // The only two exclusions. A module that is hard to test is a design
      // problem to fix, not a line to add here — in the predecessor the
      // riskiest code (the migrations) was excluded and shipped unmeasured.
      exclude: ['src/components/ui/**', 'src/**/*.d.ts'],
    },
  },
})
