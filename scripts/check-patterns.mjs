#!/usr/bin/env node
/**
 * The rules oxlint cannot express.
 *
 * oxlint covers most of what this project needs to forbid, but it has no
 * `no-restricted-syntax` and no notion of design tokens, so these patterns had
 * no enforcement at all. Rather than stand up a second linter and its plugin
 * tree to write a handful of rules, they live here: plain regexes over `src/`,
 * no dependencies, and fast enough to sit inside `npm run quality`.
 *
 * The trade-off is real and worth stating: no editor squiggle, and one blunt
 * escape hatch instead of a rule-aware one. Each of these marks a defect the
 * predecessor actually shipped, so the bar for waving one through is meant to
 * be high — see IGNORE_DIRECTIVE below.
 */
import { globSync, readFileSync } from 'node:fs'
import { relative } from 'node:path'

/**
 * Product code. The design and date rules only mean anything here — this file
 * and its test exist to *contain* the banned patterns, and scanning them would
 * flag the enforcement for enforcing.
 */
const PRODUCT = 'src/**/*.{ts,tsx,css}'

/**
 * Specs, wherever they live. Only the skipped-test rule reads these.
 *
 * `e2e/` and `.spec.` are in here deliberately: P-23 is *about* an end-to-end
 * suite, and a glob covering only `src/**\/*.test.ts` would have left the one
 * kind of file the rule exists for unread.
 */
const SPECS = '{src,scripts,e2e}/**/*.{test,spec}.{ts,tsx}'

/**
 * The component stylesheets that predated the Tailwind decision, one entry per
 * card that migrated it — shell.css by #132, pickers.css by #133. Listing them
 * let `no-per-component-stylesheet` be true *while the migration was still in
 * progress* rather than only after it finished; the epic's order was checks
 * first, precisely so the migrations could not drift while they were being
 * written.
 *
 * An allowlist is "the rule does not apply here", and it applies for exactly as
 * long as nobody deletes the line. So the enforcement test asserts each entry
 * still exists on disk — each deletion made `npm run test` fail until the line
 * was dropped in the same commit. Empty now: EPIC-013's exit criterion, kept as
 * an empty array rather than deleted so a future stylesheet reintroduces itself
 * here first, not by widening the rule.
 */
export const LEGACY_COMPONENT_STYLESHEETS = []

/** @typedef {{ id: string, message: string, pattern?: RegExp, forbidsExistence?: (file: string) => boolean, scope?: string, exempt?: (file: string) => boolean }} Rule */

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
    // Three shapes: `utility-[value]` (bg-[#ef4444], w-[13px]), the arbitrary
    // modifier `utility/[value]` (bg-primary/[.15]), and the *arbitrary
    // property* — `[margin-top:13px]`, `[color:#ef4444]`, `[--gap:2px]` — which
    // carries no utility prefix at all.
    //
    // That third shape was found by attacking the rule rather than testing it:
    // the first two alternatives anchor on a utility name before the `[`, so
    // they never see it. All three were verified to compile against the real
    // globals.css (4.3.3) — an arbitrary property emits real CSS, which makes it
    // `w-[13px]` wearing a different hat and exactly what this rule is for.
    //
    // Arbitrary *variants* — `[&>*]:mt-4`, `[&_svg]:size-4` — escape too, and
    // stay out deliberately. They are selectors, not values: no scale decision
    // leaks through one, and the directory that writes them (src/components/ui/)
    // is exempt anyway. Left uncovered on purpose, not by oversight.
    //
    // Known limits, all costing one directive line:
    //  - a regex or string of the same shape (`/month-[0-9]+/`) is a false
    //    positive;
    //  - a TypeScript index signature written without a space (`[key:string]`)
    //    matches the third alternative. Prettier writes `[key: string]` and
    //    `format:check` is part of `npm run quality`, so the spelling that trips
    //    it cannot survive a green run — the space is what tells the two apart;
    //  - an arbitrary variant whose selector starts with a letter and contains a
    //    colon (`[svg:not(…)]:size-8`, which shadcn writes) matches the third
    //    alternative for the same reason. It lives in the exempt directory.
    pattern:
      /\b[a-z][a-z0-9]*(?:-[a-z0-9]+)*[-/]\[[^\]\s]+\]|(?<![-\w])\[(?:--)?[a-z][a-z0-9-]*:[^\]\s]+\]/g,
    message:
      'Arbitrary Tailwind value. This is how a design system drifts one component at a time — ' +
      'use a scale utility, or add the value to the tokens if it is genuinely missing.',
    // src/components/ui/ is shadcn/Radix vendor code — guard-write.mjs already
    // refuses to let anyone hand-edit it, so the anti-drift rationale (someone
    // picked a magic value instead of reaching for a token) does not apply.
    // `data-[state=open]` there is Radix's own variant syntax, not a value
    // anyone chose; matching it just punishes running the CLI.
    exempt: (file) => file.startsWith('src/components/ui/'),
  },
  {
    id: 'no-vendored-compat-utility',
    // The theme layer clears Tailwind's default palette and type scale, so
    // `bg-gray-100` and `text-base` generate nothing and break visibly the
    // moment anyone writes them. That is the enforcement, and it needs no rule.
    //
    // This rule covers the handful that survived the reset *only* so that
    // src/components/ui/ keeps rendering — `text-white` and `bg-black/50` on
    // the destructive button and the two scrims, and the `text-xs`/`text-sm`/
    // `text-lg` steps the select and dialog spell literally. guard-write.mjs
    // forbids hand-editing those files, so the names had to stay reachable.
    //
    // They are the dangerous ones precisely because they still work: in product
    // code they would resolve silently, at a value nobody chose, and there
    // would be nothing to notice. Everything here has a semantic equivalent,
    // which is what the message names.
    //
    // The leading lookbehind is load-bearing: `\b` alone matches *inside* a
    // custom property, so `var(--text-lg)` and the `--text-lg` declaration in
    // tokens/typography.css both read as violations. Requiring that no `-` or
    // word character precedes the utility keeps the rule on class names and
    // off the token layer it exists to protect.
    //
    // That same lookbehind is why the families carry their own sub-segments
    // rather than relying on a loose prefix: `border-t-white` and
    // `ring-offset-black` put a `-` in front of the colour, so a rule anchored
    // on `border-`/`ring-` alone never sees them. Each family therefore spells
    // the segment it can take — the directional edges, `offset`, and the two
    // `shadow` prefixes — because a family that colours a surface is exactly as
    // dangerous through its directional variant as through its base.
    //
    // Known limit: matched as bare words, so a string that merely contains one
    // — an id, a translation key, a CSS class of one's own called
    // `panel.black` — is a false positive. The directive costs one line, and
    // narrowing this to real class attributes needs a parser.
    pattern:
      /(?<![-\w])(?:drop-|inset-)?(?:bg|text|border|ring|fill|stroke|outline|caret|decoration|divide|accent|shadow|from|via|to)(?:-(?:t|r|b|l|x|y|s|e|offset))?-(?:white|black)\b|(?<![-\w])text-(?:xs|sm|lg)\b/g,
    message:
      'Vendored-compatibility utility. `white`/`black` and the size-named type steps survive only ' +
      'so src/components/ui/ keeps rendering — product code has a role for each: a semantic colour ' +
      'token (--primary-foreground, --danger-foreground, --scrim), and text-caption / text-body / ' +
      'text-subhead for type.',
    exempt: (file) => file.startsWith('src/components/ui/'),
  },
  {
    id: 'no-per-component-stylesheet',
    // The one rule here whose violation is the file existing, not a line in it.
    // Tailwind is the styling language for all product code (docs/decisions.md,
    // settled), so a component stylesheet is not a smaller version of the right
    // answer — it is the thing the decision deletes. There is no line to point
    // at, and pointing at line 1 of a file that should not exist is the honest
    // report.
    //
    // The only stylesheets left are src/styles/tokens/*, src/styles/globals.css,
    // and the residual layer for what Tailwind genuinely cannot express
    // (@keyframes, mask: on a pseudo-element, env(safe-area-inset-bottom),
    // color-scheme). So the target is stated that way round — anywhere under
    // src/ that is not src/styles/ — rather than as src/components/ alone.
    // Naming one directory would leave src/routes/ and src/lib/ free to hold a
    // stylesheet each, which is the same defect with a different path, and this
    // repo already has both directories.
    //
    // No raw-value rule guards that residual layer, and that is a decision, not
    // an omission: `no-hardcoded-colour` already scans src/**/*.{ts,tsx,css} and
    // exempts only src/styles/tokens/, so any residual stylesheet is covered
    // against the drift that actually happened before (a pasted hex). The rest
    // of the layer is short by construction and read in review. If it stops
    // being short enough to read, that is when it earns a rule.
    //
    // The target is named here rather than through `scope`, because `check()`
    // reads the files it is handed and only `main()` globs — a rule that leaned
    // on the glob would fire on every file any other caller passed in. The
    // default PRODUCT glob already includes `.css`, so this stays one statement
    // of where style may not live, not two that can disagree.
    forbidsExistence: (file) => /^src\/(?!styles\/).+\.css$/.test(file),
    message:
      'Stylesheet outside src/styles/. Style lives in the className, next to the markup — Tailwind ' +
      'utilities over the design tokens. Only src/styles/ may hold CSS, and only for what ' +
      'Tailwind cannot express (@keyframes, mask:, env(), color-scheme).',
    exempt: (file) => LEGACY_COMPONENT_STYLESHEETS.includes(file),
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
  {
    id: 'no-locale-blind-format',
    // P-19. One component rendered dates three ways and got three different
    // wrong answers: a raw ISO string, a date formatted in the *browser's*
    // locale rather than the app's, and a raw month key. The middle one is the
    // dangerous one, because it says "locale" in the name and reads as correct
    // in review — it just means the wrong locale, and looks right on whichever
    // machine wrote it. The app's locale is bound in one place, and everything
    // asks that place: `useFormatters()`.
    //
    // Known limit: only the call is matched, so the other two thirds of P-19 —
    // an ISO string or a month key rendered straight into JSX — stay invisible
    // here and need type information to catch. `Intl.DateTimeFormat` and
    // `Intl.NumberFormat` are just as locale-blind when the locale argument is
    // omitted and are not matched either: they are how the formatters
    // themselves are built, and no call site outside them exists yet to justify
    // a rule that would have to exempt the one legitimate user.
    pattern: /\.toLocale(?:Date|Time)?String\(/g,
    message:
      'Locale-blind formatting. `toLocaleDateString()` renders in the browser’s locale, not the ' +
      'app’s, so it looks correct on the machine that wrote it. Use useFormatters() from src/i18n.',
    exempt: (file) => file.startsWith('src/i18n/'),
  },
  {
    id: 'no-skipped-tests',
    scope: SPECS,
    // P-23. The predecessor's entire replication E2E suite sat skipped while
    // looking, from the outside, exactly like coverage. A `.skip` is either
    // deleted or fixed; it does not get committed and revisited later.
    // `.only` is worse: it silently stops running every other test in the file.
    pattern: /\b(?:describe|it|test)\.(?:skip|only)\b|\b(?:xdescribe|xit)\(/g,
    message:
      'Skipped or focused test. A `.skip` looks like coverage and is not; a `.only` quietly ' +
      'stops running everything else in the file. Delete it or fix it before committing.',
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
export function blankBlockComments(source) {
  return source.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, (comment) => comment.replace(/[^\n]/g, ' '))
}

/**
 * @param {string[]} files
 * @param {Rule[]} rules
 * @returns {{ file: string, line: number, column: number, rule: string, match: string, message: string }[]}
 */
export function check(files, rules = RULES) {
  const findings = []

  for (const file of files) {
    // Read lazily: a rule that forbids the file outright never looks inside it,
    // and the caller may well be handing over a path it expects nobody to open.
    let lines

    for (const rule of rules) {
      if (rule.exempt?.(file)) continue

      if (rule.forbidsExistence) {
        if (!rule.forbidsExistence(file)) continue
        findings.push({
          file,
          line: 1,
          column: 1,
          rule: rule.id,
          match: file,
          message: rule.message,
        })
        continue
      }

      lines ??= blankBlockComments(readFileSync(file, 'utf8')).split('\n')

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
  const findings = []
  const scanned = new Set()

  // Per rule, not per file: each rule declares the tree it means something in.
  for (const rule of RULES) {
    const files = globSync(rule.scope ?? PRODUCT).map((file) => relative(process.cwd(), file))
    files.forEach((file) => scanned.add(file))
    findings.push(...check(files, [rule]))
  }

  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}:${finding.column}`)
    console.error(`  ${finding.rule}: ${finding.match}`)
    console.error(`  ${finding.message}\n`)
  }

  if (findings.length > 0) {
    console.error(`${findings.length} forbidden pattern(s) in ${scanned.size} files.`)
    process.exit(1)
  }

  console.log(`check-patterns: clean (${scanned.size} files, ${RULES.length} rules)`)
}

if (import.meta.filename === process.argv[1]) main()
