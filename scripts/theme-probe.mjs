#!/usr/bin/env node
/**
 * Does the theme still generate the utilities it claims to?
 *
 * Nothing else in this repo answers that. The linters read source and the tests
 * render components, and both are blind to a utility that quietly stopped
 * existing: BUG-001 shipped `text-lg` with its `line-height` gone — through a
 * green lint and 519 green tests — because clearing the `--text-*` namespace
 * clears each step's `--text-<step>--line-height` sibling along with it.
 *
 * So this compiles the real `src/styles/globals.css` with the real Tailwind
 * (the `compile()` the Vite plugin itself uses — no CLI, no child process,
 * ~31ms) and asserts on what comes out. Two directions, both of which are the
 * styling decision made checkable:
 *
 *   positive — every utility the theme declares generates a rule, and a rule
 *              carrying every property its tokens promised;
 *   negative — every default Tailwind cleared by the reset generates nothing,
 *              so `bg-gray-100` and `text-base` break visibly rather than
 *              shipping an off-system value.
 *
 * NEITHER LIST IS MAINTAINED BY HAND, and that is the whole design. A probe
 * carrying its own copy of the utility names would reintroduce exactly the
 * two-file synchronisation the Tailwind decision exists to delete: add
 * `--color-info` to the theme, forget the probe, and it stays green while
 * covering less than it appears to. The positives are derived from the
 * `@theme` blocks themselves; the negatives from Tailwind's own theme.css
 * minus what we re-declare.
 *
 * The one hand-maintained thing is NAMESPACES below, and it grows with
 * Tailwind's namespaces rather than with this project's tokens. It is guarded
 * by requiring every entry to yield at least one candidate — a floor that
 * cannot go stale, unlike a number.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { compile } from 'tailwindcss'

const GLOBALS = 'src/styles/globals.css'

/**
 * A custom property being *declared*, as opposed to read.
 *
 * Anchored on what can precede a declaration — the start of a line, the `{` that
 * opens the block, or the `;` that ends the previous one — rather than on the
 * line start alone. Two declarations sharing a line is legal CSS, and a
 * line-anchored pattern silently drops the second: the probe would then cover
 * one utility less while reporting nothing, which is the one way a check is
 * worse than no check. The same anchor is what keeps `var(--tw-leading-tight)`
 * out, since a read is always preceded by `(`.
 */
const DECLARATION = /(?:^|[;{])\s*(--[a-z][a-z0-9-]*)\s*:/gm

/** Tailwind's own defaults, the source of the negative list. */
const TAILWIND_THEME = 'node_modules/tailwindcss/theme.css'

/**
 * Theme namespace → the utility prefix it feeds. One prefix per namespace is
 * enough: the probe asks whether the *token* reached the theme, and if it did,
 * every utility built on it resolves. `bg-` stands in for the colour family
 * rather than enumerating bg/text/border/ring, which would test Tailwind's
 * utility table instead of our theme.
 *
 * Longest first, so `--font-weight-semibold` is not read as the `--font-*`
 * namespace with a name of `weight-semibold`.
 */
const NAMESPACES = [
  ['--font-weight-', 'font-'],
  ['--tracking-', 'tracking-'],
  ['--leading-', 'leading-'],
  ['--shadow-', 'shadow-'],
  ['--radius-', 'rounded-'],
  ['--color-', 'bg-'],
  ['--font-', 'font-'],
  ['--text-', 'text-'],
  ['--size-', 'size-'],
  ['--scale-', 'scale-'],
  ['--ease-', 'ease-'],
  ['--animate-', 'animate-'],
]

/**
 * The namespaces that are deliberately outside the probe, and why each one is.
 * A token belonging to neither list throws — "not listed" has to mean "covered
 * elsewhere", never "not thought about", and silence cannot tell the two apart.
 *
 * `--breakpoint-*` is the one entry today: a breakpoint feeds a *variant*
 * (`wide:hidden`), not a utility prefix, so there is no `wide` rule to look for
 * and the model does not fit it at all. It needs no probe either — losing
 * `--breakpoint-wide` makes every `wide:` utility generate nothing, collapsing
 * the shell to a single layout, and e2e already asserts both sides of that
 * switch. Loud failures are the ones the probe does not have to see.
 */
const UNPROBED = ['--breakpoint-']

/**
 * The braced body that follows `source[from]`, up to its matching `}`.
 *
 * Counted rather than matched with a regex: `[^}]*` stops at the first nested
 * close and would silently truncate, which in a probe means covering less than
 * it reports. Every extraction here goes through this, so there is one answer to
 * "where does this block end" rather than a careful one and a convenient one.
 */
function bodyAt(source, from) {
  const open = source.indexOf('{', from)
  // Loud rather than lenient: `indexOf` returning -1 would start the scan at
  // index -1 and read the whole file from the top, which is a wrong answer
  // wearing the shape of a right one.
  if (open === -1) throw new Error(`No block opens after index ${from} in the theme.`)

  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0) return source.slice(from, i)
  }
  throw new Error(`Unterminated block at index ${from} in the theme.`)
}

/**
 * CSS with its comments gone, wherever they opened.
 *
 * Not `blankBlockComments` from the checker, which counts only a block opening
 * its own line. That anchor is right *there* — in TypeScript, matching `/*`
 * anywhere lets a string containing one swallow real code and hide a violation,
 * and a silent false negative is the one direction an enforcement tool must not
 * fail in. Here the same anchor fails in that direction: a comment opened
 * mid-line and holding a closing brace survives the blanking, that brace closes
 * the block for `bodyAt`, and every declaration after it is dropped — while
 * Tailwind, which has a real parser, compiles them into utilities nobody
 * asserts. Measured on a fixture, not reasoned about.
 *
 * The trade that anchor buys does not exist in a theme block. Its values are
 * colours, lengths, shadows, easings and font stacks — a string literal appears
 * there (`"Nunito Sans", sans-serif`), but never one holding a comment opener.
 *
 * Known limit, shared with `bodyAt`: neither reads string boundaries. A value
 * containing `/*` would open a comment that swallows real declarations, and one
 * containing a closing brace would end the block early — both silent, both
 * covering less. Unreachable in a theme block, whose values are the list above;
 * the day it is not, the fix is a lexer, not a third regex.
 */
const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ')

/** `@theme` and `@theme inline`, wherever they open. */
const THEME_BLOCK = /@theme(?:\s+inline)?\s*\{/g

/**
 * Every `@theme` body in the stylesheet — every block, and `inline` or not.
 *
 * Three ways this can quietly cover less than it reports, all closed here:
 * a second block is legal and invisible to a single `indexOf`; `inline` is a
 * resolution mode, not a different at-rule, so a token declared in a plain
 * `@theme` generates a utility exactly like one declared inline — and this
 * file already carries both blocks, the plain one holding the reset; and the
 * word `@theme` appears in prose in the comments above them, which is why the
 * caller hands over commentless source. None of the three is visible to the
 * namespace floor, which only notices a namespace vanishing whole.
 *
 * @param {string} source commentless CSS, per `withoutComments`
 */
function themeBodies(source) {
  return [...source.matchAll(THEME_BLOCK)].map((match) => bodyAt(source, match.index))
}

/** `--text-hero--line-height` → the base name and the property it promises. */
function splitPair(name) {
  const at = name.indexOf('--', 2)
  return at === -1 ? { base: name } : { base: name.slice(0, at), property: name.slice(at + 2) }
}

/**
 * The utilities the theme says it generates, read off the theme itself.
 *
 * Each candidate carries the properties its own tokens promised. That is what
 * generalises BUG-001 past the single pair that caused it: the suffix of
 * `--text-hero--line-height` *is* the CSS property name, so the rule for
 * `text-hero` has to contain `line-height:`. The day anyone declares a
 * `--text-x--letter-spacing`, it is covered with no edit here.
 *
 * @param {string} css contents of globals.css
 * @returns {{ candidate: string, namespace: string, properties: string[] }[]}
 */
export function deriveDeclared(css) {
  // Commentless, because `DECLARATION` cannot tell a declaration from prose
  // about one, and the comments in globals.css quote both `@theme` and
  // `--text-xs: .75rem`. A phantom candidate fails the build lookup and reports
  // a regression that is not there — and a comment holding a brace ends the
  // block early, which drops every declaration after it in silence.
  const source = withoutComments(css)
  const theme = themeBodies(source).join('\n')
  const properties = new Map()
  const candidates = new Map()

  for (const [, name] of theme.matchAll(DECLARATION)) {
    const { base, property } = splitPair(name)

    if (property) {
      properties.set(base, [...(properties.get(base) ?? []), property])
      continue
    }

    const entry = NAMESPACES.find(([namespace]) => base.startsWith(namespace))
    if (entry) {
      candidates.set(base, entry)
      continue
    }

    // The probe's own blind spot, closed. Dropping an unclaimed token left a
    // typo — `--clor-primary` — declaring nothing, generating nothing, and
    // reported as covered. A namespace it genuinely need not probe goes in
    // UNPROBED with its reason; everything else is a mistake, and says so.
    if (!UNPROBED.some((namespace) => base.startsWith(namespace)))
      throw new Error(
        `${base} is declared in @theme but no namespace claims it. Add its namespace to ` +
          `NAMESPACES, or to UNPROBED with the reason it needs no probe.`,
      )
  }

  const declared = [...candidates].map(([token, [namespace, prefix]]) => ({
    candidate: prefix + token.slice(namespace.length),
    namespace,
    properties: properties.get(token) ?? [],
  }))

  // Custom utilities are named in full — `duration-*` has no theme namespace at
  // all (verified against 4.3.3), which is why they are `@utility` blocks.
  for (const [, name] of source.matchAll(/^@utility\s+([a-z][a-z0-9-]*)\s*\{/gm)) {
    declared.push({ candidate: name, namespace: '@utility', properties: [] })
  }

  return declared
}

/**
 * The utilities the reset took away: Tailwind's own `--color-*` and `--text-*`
 * defaults, minus the handful we re-declare on purpose.
 *
 * The subtraction is what keeps this honest in both directions. `--color-white`,
 * `--color-black` and the three size-named type steps survive the reset so the
 * vendored primitives keep rendering; a fixed list would call each of them a
 * regression, and the day one is dropped for real the subtraction notices.
 *
 * @returns {string[]}
 */
export function deriveNeutralised(css, tailwindTheme) {
  const survives = new Set(
    [...themeBodies(withoutComments(css)).join('\n').matchAll(DECLARATION)].map(
      ([, name]) => splitPair(name).base,
    ),
  )

  // The same `DECLARATION` the positive side reads, rather than a second,
  // line-anchored pattern of its own. Tailwind's theme.css puts one declaration
  // per line today, so the two agree today — and keeping two answers to one
  // question is how the careful one stops being used.
  //
  // Six more joined --color-/--text- in #135: every namespace the reset above
  // now clears, same prefix each already carries in NAMESPACES — reused rather
  // than repeated, so a namespace cannot drift between what it means for the
  // positive side and what it means for the negative one.
  const RESET = [
    ['--color-', 'bg-'],
    ['--text-', 'text-'],
    ['--font-weight-', 'font-'],
    ['--tracking-', 'tracking-'],
    ['--leading-', 'leading-'],
    ['--radius-', 'rounded-'],
    ['--shadow-', 'shadow-'],
    ['--ease-', 'ease-'],
  ]

  const cleared = new Set()
  for (const [, name] of withoutComments(tailwindTheme).matchAll(DECLARATION)) {
    const { base, property } = splitPair(name)
    if (property || survives.has(base)) continue

    // `--text-shadow-*` is excluded because it is a *different namespace*, not
    // a step of the type scale: `--text-*: initial` does not reach it, and
    // `text-shadow-md` still generates a shadow nothing in this design system
    // names. Card #135 measured 61 such off-system utilities the day it ran;
    // six of the namespaces it found — --font-weight-*, --tracking-*,
    // --leading-*, --radius-*, --shadow-* and --ease-* — are closed above and
    // covered by RESET now. What is left open (--inset-shadow-*,
    // --drop-shadow-*, --text-shadow-*, --animate-*, --blur-*, --perspective-*,
    // --aspect-*, --container-*) is a deliberate decision recorded in
    // globals.css's reset comment, not a gap this probe missed — it reports
    // what the reset it can see actually cleared, and calling text-shadow a
    // regression here would be blaming the probe's own reading for a decision
    // made somewhere else.
    if (base.startsWith('--text-shadow-')) continue

    const entry = RESET.find(([namespace]) => base.startsWith(namespace))
    if (entry) cleared.add(entry[1] + base.slice(entry[0].length))
  }

  return [...cleared]
}

/**
 * Refuses to run if any part of the theme surface moved into an imported file.
 *
 * The derivation reads the entry stylesheet as text; the compiler resolves
 * `@import`. Move a `@theme inline` block into `tokens/` and those two stop
 * describing the same theme — the compiler would still generate the utilities
 * while the probe stopped asking about them. Nothing would go red, and the
 * namespace floor cannot see it either: it only notices a namespace vanishing
 * whole, not one that still has a token left behind here.
 *
 * So the split is refused rather than handled. Resolving imports in the
 * extractor would be the general fix, and there is nothing to be general about
 * yet — this repo keeps every `@theme` in one file on purpose, and the day that
 * changes, this error says exactly what to extend.
 */
function assertThemeIsNotSplit(css, base, seen = new Set()) {
  // Relative imports only. `@import 'tailwindcss'` resolves into node_modules,
  // and that file is *made* of `@theme` — following it would make this throw on
  // every run. A bare specifier is a package, not part of this theme.
  for (const [, id] of withoutComments(css).matchAll(/@import\s+['"](\.[^'"]+)['"]/g)) {
    const path = resolve(base, id)
    if (seen.has(path)) continue
    seen.add(path)

    const imported = withoutComments(readFileSync(path, 'utf8'))
    if (!/@(?:theme|utility)\b/.test(imported)) {
      // Follow the chain: a theme two hops away is split exactly as well as one
      // hop away, and tokens/ importing tokens/ is the shape that would do it.
      assertThemeIsNotSplit(imported, dirname(path), seen)
      continue
    }

    throw new Error(
      `Theme probe cannot run: ${relative(process.cwd(), path)} declares @theme or @utility. The probe derives its ` +
        `candidates from the entry stylesheet only, so utilities declared here would be compiled ` +
        `but never asserted. Keep the theme surface in one file, or teach deriveDeclared() to ` +
        `resolve @import.`,
    )
  }
}

/** Compiles the real theme, resolving `@import` the way the Vite plugin does. */
export async function compileTheme(entry = GLOBALS) {
  for (const required of [entry, TAILWIND_THEME]) {
    // Loud, because the alternative is a probe that quietly tests nothing.
    if (!existsSync(required)) throw new Error(`Theme probe cannot run: ${required} is missing.`)
  }

  return compile(readFileSync(entry, 'utf8'), {
    base: dirname(entry),
    async loadStylesheet(id, base) {
      const path = id.startsWith('tailwindcss')
        ? resolve('node_modules', id === 'tailwindcss' ? 'tailwindcss/index.css' : id)
        : resolve(base, id)
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') }
    },
  })
}

/**
 * The generated rule for one class, or undefined when nothing was generated.
 *
 * Asserted by selector rather than by output size: `build([])` already returns
 * 15KB of preflight and theme, so "generated nothing" can never mean an empty
 * string, and a byte delta measures length where the question is identity.
 */
export function ruleFor(css, candidate) {
  const selector = candidate.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
  const at = css.search(new RegExp(`\\.${selector}\\s*\\{`))
  if (at === -1) return undefined

  // Same brace counting as every other extraction here. No rule Tailwind emits
  // for these candidates nests today (measured across all 92), but a `[^}]*`
  // that quietly truncates the day one does is the failure this whole file is
  // about — and there is no reason to keep two answers to one question.
  const body = bodyAt(css, at)
  return body.slice(body.indexOf('{') + 1)
}

/**
 * Everything the probe needs, compiled once.
 *
 * One `build()` over every candidate rather than one per candidate: the answer
 * is the same and it costs milliseconds instead of seconds.
 */
export async function probeTheme(entry = GLOBALS) {
  const css = readFileSync(entry, 'utf8')
  assertThemeIsNotSplit(css, dirname(entry))
  const declared = deriveDeclared(css)
  const neutralised = deriveNeutralised(css, readFileSync(TAILWIND_THEME, 'utf8'))
  const compiler = await compileTheme(entry)

  return {
    declared,
    neutralised,
    namespaces: NAMESPACES.map(([namespace]) => namespace),
    generated: compiler.build([...declared.map((d) => d.candidate), ...neutralised]),
  }
}
