#!/usr/bin/env node
/**
 * The rules oxlint cannot express.
 *
 * oxlint covers most of what this project needs to forbid, but it has no
 * `no-restricted-syntax` and no notion of design tokens, so four patterns had
 * no enforcement at all. Rather than stand up a second linter and its plugin
 * tree to write four rules, they live here: plain regexes over `src/`, no
 * dependencies, and fast enough to sit inside `npm run quality`.
 *
 * The trade-off is real and worth stating: no editor squiggle, and one blunt
 * escape hatch instead of a rule-aware one. Each of these marks a defect the
 * predecessor actually shipped, so the bar for waving one through is meant to
 * be high — see IGNORE_DIRECTIVE below.
 */
import { globSync, readFileSync } from 'node:fs'
import { relative } from 'node:path'

const SCANNED = 'src/**/*.{ts,tsx,css}'

/** @typedef {{ id: string, pattern: RegExp, message: string, exempt?: (file: string) => boolean }} Rule */

/** @type {Rule[]} */
export const RULES = [
  {
    id: 'no-hardcoded-colour',
    // Hex in the four lengths CSS accepts, plus the functional notations. A
    // colour pasted from a design tool arrives in one of these; leaving rgb()
    // out would just move the drift rather than stop it.
    //
    // Known limit: an anchor or issue reference whose id happens to be all hex
    // digits — `href="#feed"`, `// fixes #404` — matches. Rare, and the ignore
    // directive costs one line. Narrowing the rule to avoid it would cost the
    // three-digit shorthand, which is a real colour people really write.
    pattern:
      /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|\b(?:rgba?|hsla?)\(/g,
    message:
      'Hardcoded colour. Product code consumes semantic tokens (--primary, --danger, …); ' +
      'raw values live only in src/styles/tokens/, and even there the palette is oklch.',
    exempt: (file) => file.startsWith('src/styles/tokens/'),
  },
  {
    id: 'no-arbitrary-tailwind',
    // Two shapes: `utility-[value]` (bg-[#ef4444], w-[13px]) and the arbitrary
    // modifier `utility/[value]` (bg-primary/[.15]).
    //
    // Known limit: a regex or string of the same shape — `/month-[0-9]+/` — is
    // a false positive. `[prop:value]` is deliberately not matched, because it
    // collides with TypeScript index signatures.
    pattern: /\b[a-z][a-z0-9]*(?:-[a-z0-9]+)*[-/]\[[^\]\s]+\]/g,
    message:
      'Arbitrary Tailwind value. This is how a design system drifts one component at a time — ' +
      'use a scale utility, or add the value to the tokens if it is genuinely missing.',
  },
  {
    id: 'no-date-from-string',
    // `new Date('2026-07-01')` parses as UTC midnight, which is the previous
    // day west of Greenwich. `Date.parse` has exactly the same problem and is
    // the obvious way around a rule that only names the constructor.
    //
    // Known limit: `new Date(someString)` passes, because knowing the variable
    // holds a string needs type information. An explicit-offset string such as
    // '1970-01-01T00:00:00.000Z' is unambiguous and safe, but still flagged —
    // use the directive.
    pattern: /new Date\(\s*['"`]|Date\.parse\(/g,
    message:
      'Date parsed from a string. `new Date("2026-07-01")` is UTC midnight, which reads as ' +
      'the previous day in São Paulo. Build it from parts, or use the helpers in src/domain/month.ts.',
  },
  {
    id: 'no-array-mutation',
    // oxlint has unicorn/no-array-sort and unicorn/no-array-reverse, and they
    // are not used, because they only fire where oxlint can statically see the
    // receiver is an array — an array literal, or a local initialised from one.
    // The shape that actually caused P-09 is
    //
    //   const items = useItemsStore((s) => s.items)
    //   items.sort(...)
    //
    // where the receiver comes back from a hook and oxlint stays silent. A
    // rule that misses the only case it exists for is worse than no rule: it
    // reads like coverage. Matching the call site catches every receiver.
    //
    // There is no legitimate exception. `toSorted`, `toReversed` and
    // `toSpliced` are all ES2023, which this project targets, and each returns
    // a copy. Sorting a genuinely local array in place saves one allocation and
    // costs the guarantee. That includes inside an Immer producer, where
    // mutating the draft is idiomatic: `state.items = state.items.toSorted(…)`
    // works there too and reads the same everywhere else.
    //
    // Known limit: `push`, `pop`, `shift`, `unshift` and `fill` mutate a
    // selector result just as badly and are NOT matched. None of them has a
    // drop-in copying twin, so banning them outright would reject the many
    // legitimate uses on genuinely local arrays. Catching only the store case
    // needs type information — the one rule here that a regex cannot reach.
    pattern: /\.(?:sort|reverse|splice)\(/g,
    message:
      'In-place array mutation. A value read from a store selector *is* the store’s state, ' +
      'so sorting it sorts the store. Use toSorted(), toReversed() or toSpliced() — each returns a copy.',
  },
]

/**
 * The one escape hatch. Put it on the line above the offending line, with a
 * reason. It is greppable on purpose: `rg check-patterns-ignore src` is the
 * complete list of places this project knowingly writes a banned pattern, and
 * that list should stay short enough to read.
 */
const IGNORE_DIRECTIVE = 'check-patterns-ignore-next-line'

/**
 * Block comments are blanked before matching, line by line so positions hold.
 *
 * Documentation is where the banned patterns get *explained* — `month.ts`
 * opens by saying never to write `new Date('2026-07-01')` — and a rule that
 * cannot be described in a doc comment teaches people to stop describing it.
 *
 * Only a block that *opens its own line* counts, which is every doc comment and
 * no string literal. Matching `/*` anywhere would let a string containing one
 * open a comment that swallows real code up to the next string containing `*​/`,
 * hiding whatever lay between — a silent false negative, in the one direction
 * an enforcement tool must never fail. Line comments are left alone entirely:
 * stripping those means guessing whether `//` opens a comment or sits inside a
 * URL, and guessing wrong hides real code the same way.
 */
function blankBlockComments(source) {
  return source.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, (comment) => comment.replace(/[^\n]/g, ' '))
}

/**
 * @param {string[]} files
 * @returns {{ file: string, line: number, column: number, rule: string, match: string, message: string }[]}
 */
export function check(files) {
  const findings = []

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const lines = blankBlockComments(source).split('\n')

    for (const rule of RULES) {
      if (rule.exempt?.(file)) continue

      lines.forEach((text, index) => {
        if (index > 0 && lines[index - 1].includes(IGNORE_DIRECTIVE)) return

        for (const match of text.matchAll(rule.pattern)) {
          findings.push({
            file,
            line: index + 1,
            column: (match.index ?? 0) + 1,
            rule: rule.id,
            match: match[0],
            message: rule.message,
          })
        }
      })
    }
  }

  return findings
}

function main() {
  const files = globSync(SCANNED).map((file) => relative(process.cwd(), file))
  const findings = check(files)

  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}:${finding.column}`)
    console.error(`  ${finding.rule}: ${finding.match}`)
    console.error(`  ${finding.message}\n`)
  }

  if (findings.length > 0) {
    console.error(`${findings.length} forbidden pattern(s) in ${files.length} files.`)
    process.exit(1)
  }

  console.log(`check-patterns: clean (${files.length} files, ${RULES.length} rules)`)
}

if (import.meta.filename === process.argv[1]) main()
