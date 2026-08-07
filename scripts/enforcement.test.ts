import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RULES, check } from './check-patterns.mjs'
import { check as checkMessages } from './check-messages.mjs'

/**
 * Proof that the enforcement fires.
 *
 * A rule that is configured but never demonstrated failing is the same thing as
 * no rule: the predecessor's own tooling notes warn that none of this stack had
 * been validated together. So every rule here gets a deliberate violation and
 * has to reject it, and the allowlists get a case proving they still let the
 * legitimate thing through.
 *
 * Fixtures are written to a temp directory rather than committed, so they can
 * hold the exact patterns the repo forbids without the repo's own checks
 * tripping over them.
 */

let workspace: string

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), 'nagi-enforcement-'))
})

afterAll(() => {
  rmSync(workspace, { recursive: true, force: true })
})

function fixture(name: string, source: string): string {
  const path = join(workspace, name)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, source, 'utf8')
  return path
}

/** Runs the repo's real oxlint config against one file. */
function lint(name: string, source: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync(
      'node_modules/.bin/oxlint',
      ['-c', '.oxlintrc.json', '--format=default', fixture(name, source)],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
    return { ok: true, output }
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string }
    return { ok: false, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` }
  }
}

describe('oxlint rejects the defects it is configured for', () => {
  it('rejects a user-visible literal in JSX (P-08)', () => {
    const { ok, output } = lint(
      'literal.tsx',
      `export function C() {\n  return <h1>Monthly overview</h1>\n}\n`,
    )

    expect(ok).toBe(false)
    expect(output).toContain('jsx-no-literals')
  })

  it('still allows the curated symbols, so the rule stays usable', () => {
    const { ok } = lint('symbol.tsx', `export function C() {\n  return <span>·</span>\n}\n`)

    expect(ok).toBe(true)
  })
})

describe('check-patterns rejects what oxlint cannot express', () => {
  function findings(name: string, source: string) {
    return check([fixture(name, source)])
  }

  // Every notation a colour arrives in when it is pasted from a design tool.
  it.each(["'#ef4444'", "'#fff'", "'rgb(239, 68, 68)'", "'rgba(0,0,0,.5)'", "'hsl(0 84% 60%)'"])(
    'rejects the hardcoded colour %s',
    (value) => {
      const found = findings(`colour-${value.length}.ts`, `export const danger = ${value}\n`)

      expect(found.map((f) => f.rule)).toContain('no-hardcoded-colour')
    },
  )

  it.each(['rounded bg-[#ef4444] p-4', 'bg-primary/[.15]', 'w-[13px]'])(
    'rejects the arbitrary Tailwind value in %s',
    (className) => {
      const found = findings(`tw-${className.length}.tsx`, `export const c = '${className}'\n`)

      expect(found.map((f) => f.rule)).toContain('no-arbitrary-tailwind')
    },
  )

  // The utilities that survived the theme reset only so src/components/ui/
  // keeps rendering. They are worth a rule precisely because they still
  // resolve: unlike `bg-gray-100`, writing one in product code produces no
  // visible breakage to notice.
  it.each([
    'bg-destructive text-white',
    'fixed inset-0 bg-black/50',
    'border-white/20',
    'text-sm font-medium',
    'text-lg leading-none',
    'text-xs uppercase',
    // The directional and prefixed forms. A rule anchored on `border-`/`ring-`
    // alone misses every one of these, because the `-` in front of the colour
    // trips the same lookbehind that keeps the rule off the token layer.
    'border-t-white',
    'divide-y-black',
    'ring-offset-white',
    'shadow-black/40',
    'drop-shadow-white',
    'inset-shadow-black',
  ])('rejects the vendored-compat utility in %s', (className) => {
    const found = findings(`compat-${className.length}.tsx`, `export const c = '${className}'\n`)

    expect(found.map((f) => f.rule)).toContain('no-vendored-compat-utility')
  })

  // The regression this rule shipped with: `\b` matches inside a custom
  // property, so every `var(--text-lg)` in the token layer read as a
  // violation — the rule firing on the very thing it protects.
  it.each([
    '--text-lg: 1rem;',
    'font-size: var(--text-xs);',
    '--tw-text-sm: var(--text-base);',
    '--color-white: var(--white);',
  ])('leaves the token declaration %s alone', (declaration) => {
    const found = findings(`token-${declaration.length}.css`, `:root {\n  ${declaration}\n}\n`)

    expect(found.map((f) => f.rule)).not.toContain('no-vendored-compat-utility')
  })

  // Date.parse is the obvious way around a rule that only names the
  // constructor, and it has exactly the same UTC problem.
  it.each([`new Date('2026-07-01')`, `Date.parse('2026-07-01')`])(
    'rejects %s (P-13)',
    (expression) => {
      const found = findings(`date-${expression.length}.ts`, `export const d = ${expression}\n`)

      expect(found.map((f) => f.rule)).toContain('no-date-from-string')
    },
  )

  // The browser's locale is not the app's, and the call site says "locale"
  // loudly enough to read as correct in review.
  it.each([
    'toLocaleDateString()',
    "toLocaleDateString('pt-BR')",
    'toLocaleTimeString()',
    'toLocaleString()',
  ])('rejects date.%s (P-19)', (call) => {
    const found = findings(
      `locale-${call.replace(/\W/g, '')}.ts`,
      `export const label = date.${call}\n`,
    )

    expect(found.map((f) => f.rule)).toContain('no-locale-blind-format')
  })

  it('leaves ordinary TypeScript alone', () => {
    const found = findings(
      'ordinary.ts',
      [
        `type A = Record<string, string[]>`,
        `const m = new Map<string, number[]>()`,
        `export const x = obj['some-key']`,
        `export const y = arr[index - 1]`,
        `export const t = 'grid-cols-3 gap-4'`,
        `export const u = \`\${a}-\${b}\``,
      ].join('\n'),
    )

    expect(found).toEqual([])
  })

  // The receiver here comes back from a hook, which is the shape that caused
  // P-09 and the shape oxlint's own array rules cannot see. Each has to be
  // caught on the call site.
  it.each(['sort((a, b) => a - b)', 'reverse()', 'splice(0, 1)'])(
    'rejects an in-place %s on a value read from a store (P-09)',
    (call) => {
      const found = findings(
        `mutate-${call.slice(0, 4)}.ts`,
        `const items = useItemsStore((s) => s.items)\nexport const x = items.${call}\n`,
      )

      expect(found.map((f) => f.rule)).toContain('no-array-mutation')
    },
  )

  it('reports the line and column, so the message is actionable', () => {
    const [first] = findings('where.ts', `const a = 1\nexport const danger = '#ef4444'\n`)

    expect(first.line).toBe(2)
    expect(first.column).toBeGreaterThan(1)
  })
})

describe('the escape hatches let the legitimate cases through', () => {
  function findings(name: string, source: string) {
    return check([fixture(name, source)])
  }

  it('does not flag a banned pattern described in a doc comment', () => {
    const found = findings(
      'documented.ts',
      `/** Never write new Date('2026-07-01') — it parses as UTC. */\nexport const x = 1\n`,
    )

    expect(found).toHaveLength(0)
  })

  it('does not let a string containing a comment opener hide real code', () => {
    // Only a block comment that opens its own line is blanked. Matching `/*`
    // anywhere would let this string open a comment running to the one below,
    // swallowing the violation between them — a silent false negative, in the
    // one direction an enforcement tool must never fail.
    const found = findings(
      'fake-comment.ts',
      `const open = '/*'\nexport const danger = '#ef4444'\nconst close = '*/'\n`,
    )

    expect(found.map((f) => f.rule)).toContain('no-hardcoded-colour')
  })

  it('honours the ignore directive on the line above', () => {
    const found = findings(
      'ignored.ts',
      `// check-patterns-ignore-next-line: proving the defect\nexport const d = new Date('2026-07-01')\n`,
    )

    expect(found).toHaveLength(0)
  })

  it('exempts the token files from the colour rule, and nothing else', () => {
    // Asserted on the predicate rather than through `check()`, because the
    // exemption is keyed on the repo-relative path and a temp fixture has none.
    const colour = RULES.find((rule) => rule.id === 'no-hardcoded-colour')!

    expect(colour.exempt?.('src/styles/tokens/palette.css')).toBe(true)
    expect(colour.exempt?.('src/routes/home.tsx')).toBe(false)
    expect(colour.exempt?.('src/styles/globals.css')).toBe(false)
  })

  it('exempts the vendored primitives from the compat rule, and nothing else', () => {
    // guard-write.mjs forbids hand-editing these files, so the rule would ban
    // a spelling nobody in this repo is allowed to change.
    const compat = RULES.find((rule) => rule.id === 'no-vendored-compat-utility')!

    expect(compat.exempt?.('src/components/ui/button.tsx')).toBe(true)
    expect(compat.exempt?.('src/components/shell/TabBar.tsx')).toBe(false)
    expect(compat.exempt?.('src/styles/globals.css')).toBe(false)
  })

  it('exempts the formatters from the locale rule, and nothing else', () => {
    // The one place allowed to format: it is where the app's locale is bound,
    // so a rule that flagged it would ban the fix along with the defect.
    const locale = RULES.find((rule) => rule.id === 'no-locale-blind-format')!

    expect(locale.exempt?.('src/i18n/formatters.ts')).toBe(true)
    expect(locale.exempt?.('src/routes/home.tsx')).toBe(false)
    expect(locale.exempt?.('src/domain/month.ts')).toBe(false)
  })
})

describe('skipped and focused tests do not reach the branch (P-23)', () => {
  // The predecessor's entire replication E2E suite sat skipped, looking from
  // the outside exactly like coverage.
  //
  // This file is itself a spec, so the rule reads it — and this line has to
  // spell out every form it rejects. The one directive that earns its keep.
  // check-patterns-ignore-next-line: naming the forbidden forms is the test
  it.each(['it.skip(', 'describe.skip(', 'it.only(', 'describe.only(', 'test.only(', 'xit('])(
    'rejects %s',
    (form) => {
      const found = check([
        fixture(`spec-${form.length}-${form[0]}.test.ts`, `${form}'x', () => {})\n`),
      ])

      expect(found.map((f) => f.rule)).toContain('no-skipped-tests')
    },
  )

  it('leaves it.each and ordinary calls alone', () => {
    const found = check([
      fixture('fine.test.ts', `it.each([1])('x', () => {})\nit('y', () => {})\n`),
    ])

    expect(found).toEqual([])
  })

  it('reads specs only, not product code', () => {
    const rule = RULES.find((r) => r.id === 'no-skipped-tests')!

    expect(rule.scope).toContain('test,spec')
  })

  // The pitfall this rule exists for is an end-to-end suite that sat skipped
  // while looking like coverage. A glob that misses `e2e/*.spec.ts` misses it.
  it('reads the end-to-end specs, which are the ones P-23 is about', () => {
    const rule = RULES.find((r) => r.id === 'no-skipped-tests')!

    expect(rule.scope).toContain('e2e')
  })
})

describe('message catalogues (P-08)', () => {
  function catalogue(name: string, messages: Record<string, unknown>, source = '', spec = '') {
    const root = join(workspace, name)
    for (const [locale, content] of Object.entries(messages)) {
      fixture(`${name}/messages/${locale}.json`, JSON.stringify(content))
    }
    fixture(`${name}/app.tsx`, source)
    fixture(`${name}/app.test.tsx`, spec)
    return checkMessages({
      messages: `${root}/messages/*.json`,
      sources: `${root}/*.tsx`,
    })
  }

  const used = `const t = useTranslations('app')\nexport const x = t('title')\n`

  it('accepts catalogues that agree and keys that are used', () => {
    const problems = catalogue(
      'good',
      { en: { app: { title: 'Nagi' } }, 'pt-BR': { app: { title: 'Nagi' } } },
      used,
    )

    expect(problems).toEqual([])
  })

  it('rejects a key added to one locale only', () => {
    const problems = catalogue(
      'missing',
      { en: { app: { title: 'Nagi', tagline: 'calm' } }, 'pt-BR': { app: { title: 'Nagi' } } },
      `${used}export const y = t('tagline')\n`,
    )

    expect(problems.join('\n')).toContain('missing "app.tagline"')
  })

  it('rejects a key that exists only outside the source locale', () => {
    const problems = catalogue(
      'extra',
      { en: { app: { title: 'Nagi' } }, 'pt-BR': { app: { title: 'Nagi', extra: 'x' } } },
      used,
    )

    expect(problems.join('\n')).toContain('"app.extra" is not in en.json')
  })

  it.each(['t.rich', 't.raw', 't.markup'])('counts %s as a reference', (method) => {
    const problems = catalogue(
      `method-${method.length}-${method.slice(-3)}`,
      { en: { app: { title: 'Nagi' } }, 'pt-BR': { app: { title: 'Nagi' } } },
      `const t = useTranslations('app')\nexport const x = ${method}('title')\n`,
    )

    expect(problems).toEqual([])
  })

  // A key assembled at runtime cannot be resolved, so every key it might name
  // would look dead. Reported instead of guessed at, in either direction.
  it('rejects a key built at runtime rather than calling other keys unused', () => {
    const problems = catalogue(
      'dynamic',
      { en: { app: { title: 'Nagi' } }, 'pt-BR': { app: { title: 'Nagi' } } },
      "const t = useTranslations('app')\nexport const x = t(`title.${kind}`)\n",
    )

    expect(problems.join('\n')).toContain('key built at runtime')
    expect(problems.join('\n')).not.toContain('never referenced')
  })

  it('treats an empty group as a key, so it cannot vanish from the comparison', () => {
    const problems = catalogue(
      'empty',
      { en: { app: { title: 'Nagi' }, meta: {} }, 'pt-BR': { app: { title: 'Nagi' } } },
      used,
    )

    expect(problems.join('\n')).toContain('missing "meta"')
  })

  it('rejects a key nothing references — the dead dashboard set', () => {
    const problems = catalogue(
      'dead',
      {
        en: { app: { title: 'Nagi' }, dashboard: { heading: 'Dashboard' } },
        'pt-BR': { app: { title: 'Nagi' }, dashboard: { heading: 'Painel' } },
      },
      used,
    )

    expect(problems.join('\n')).toContain('"dashboard.heading" is defined but never referenced')
  })

  // A key only a test fixture reaches renders nowhere. `app.tagline` lived in
  // both catalogues on exactly this footing, and the check called it live.
  it('does not count a reference from a spec as a use', () => {
    const problems = catalogue(
      'test-only',
      {
        en: { app: { title: 'Nagi', tagline: 'calm' } },
        'pt-BR': { app: { title: 'Nagi', tagline: 'calmaria' } },
      },
      used,
      `${used}export const y = t('tagline')\n`,
    )

    expect(problems.join('\n')).toContain('"app.tagline" is defined but never referenced')
  })
})

describe('the enforcement covers what it claims to', () => {
  it('runs every rule the checker defines', () => {
    // A rule added without a proof above should fail here rather than ship as
    // configuration nobody ever saw reject anything.
    expect(RULES.map((rule) => rule.id).sort()).toEqual([
      'no-arbitrary-tailwind',
      'no-array-mutation',
      'no-date-from-string',
      'no-hardcoded-colour',
      'no-locale-blind-format',
      'no-skipped-tests',
      'no-vendored-compat-utility',
    ])
  })
})
