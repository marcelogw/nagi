#!/usr/bin/env node
/**
 * Bundle budget.
 *
 * Not a performance target — a tripwire. Nobody notices a dependency that adds
 * 300 KB until the app is slow on the connection it was meant to be calm on,
 * and by then it is load-bearing. The budget is deliberately loose: it should
 * never fire for ordinary feature work, only for something that arrived by
 * accident.
 *
 * Gzipped, because that is what the user downloads.
 *
 * Raising a budget is a real decision. Do it in a commit that says what was
 * added and why it earns the room, not as a drive-by to get CI green.
 */
import { globSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { basename } from 'node:path'

const BUDGETS = [
  { label: 'JavaScript', pattern: 'dist/assets/*.js', limitKb: 200 },
  { label: 'CSS', pattern: 'dist/assets/*.css', limitKb: 50 },
]

const kb = (bytes) => bytes / 1024

export function measure(budgets = BUDGETS) {
  return budgets.map(({ label, pattern, limitKb }) => {
    const files = globSync(pattern)
    const totalKb = files.reduce((sum, file) => sum + kb(gzipSync(readFileSync(file)).length), 0)

    return {
      label,
      limitKb,
      totalKb,
      files: files.map((f) => basename(f)),
      over: totalKb > limitKb,
    }
  })
}

function main() {
  const results = measure()

  if (results.every((r) => r.files.length === 0)) {
    console.error('check-bundle: no dist/ output. Run `npm run build` first.')
    process.exit(1)
  }

  for (const { label, totalKb, limitKb, over } of results) {
    const line = `${label}: ${totalKb.toFixed(1)} KB gzipped of ${limitKb} KB budget`
    if (over) console.error(`OVER — ${line}`)
    else console.log(`ok   — ${line}`)
  }

  if (results.some((r) => r.over)) {
    console.error(
      '\nBundle budget exceeded. Either the addition is not worth its weight, or the ' +
        'budget moves in a commit that argues for it.',
    )
    process.exit(1)
  }
}

if (import.meta.filename === process.argv[1]) main()
