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
 * `@theme inline` block itself; the negatives from Tailwind's own theme.css
 * minus what we re-declare.
 *
 * The one hand-maintained thing is NAMESPACES below, and it grows with
 * Tailwind's namespaces rather than with this project's tokens. It is guarded
 * by requiring every entry to yield at least one candidate — a floor that
 * cannot go stale, unlike a number.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
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
  ['--ease-', 'ease-'],
]

/**
 * The braced body of an at-rule, from the opening `{` to its matching `}`.
 *
 * Counted rather than matched with a regex: `[^}]*` stops at the first nested
 * close and would silently truncate the block, which in a probe means testing
 * fewer utilities than it reports.
 */
function blockBody(source, opener) {
  const start = source.indexOf(opener)
  if (start === -1) return ''

  let depth = 0
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i)
  }
  throw new Error(`Unterminated block for "${opener}" in the theme.`)
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
  const theme = blockBody(css, '@theme inline')
  const properties = new Map()
  const candidates = new Map()

  for (const [, name] of theme.matchAll(DECLARATION)) {
    const { base, property } = splitPair(name)

    if (property) {
      properties.set(base, [...(properties.get(base) ?? []), property])
      continue
    }

    const entry = NAMESPACES.find(([namespace]) => base.startsWith(namespace))
    if (entry) candidates.set(base, entry)
  }

  const declared = [...candidates].map(([token, [namespace, prefix]]) => ({
    candidate: prefix + token.slice(namespace.length),
    namespace,
    properties: properties.get(token) ?? [],
  }))

  // Custom utilities are named in full — `duration-*` has no theme namespace at
  // all (verified against 4.3.3), which is why they are `@utility` blocks.
  for (const [, name] of css.matchAll(/^@utility\s+([a-z][a-z0-9-]*)\s*\{/gm)) {
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
    [...blockBody(css, '@theme inline').matchAll(DECLARATION)].map(
      ([, name]) => splitPair(name).base,
    ),
  )

  // `--text-shadow-*` is excluded because it is a *different namespace*, not a
  // step of the type scale: `--text-*: initial` does not reach it, and
  // `text-shadow-md` still generates a shadow nothing in this design system
  // names. It is not alone — 61 off-system utilities survive the reset across
  // --shadow-*, --blur-*, --animate-*, --container-* and others (measured).
  // Which namespaces the design system closes is a theme decision, tracked
  // separately; this probe reports what the reset it can see actually cleared,
  // and calling text-shadow a regression here would be blaming the probe's own
  // reading for a gap somewhere else.
  const cleared = new Set()
  for (const [, name] of tailwindTheme.matchAll(
    /^\s*(--(?:color|text)-(?!shadow-)[a-z0-9-]*)\s*:/gm,
  )) {
    const { base, property } = splitPair(name)
    if (property || survives.has(base)) continue
    cleared.add(base.startsWith('--color-') ? `bg-${base.slice(8)}` : `text-${base.slice(7)}`)
  }

  return [...cleared]
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
  return css.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`))?.[1]
}

/**
 * Everything the probe needs, compiled once.
 *
 * One `build()` over every candidate rather than one per candidate: the answer
 * is the same and it costs milliseconds instead of seconds.
 */
export async function probeTheme(entry = GLOBALS) {
  const css = readFileSync(entry, 'utf8')
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
