import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RULES, check } from './check-patterns.mjs'

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

  it('rejects a hardcoded hex colour', () => {
    const found = findings('colour.ts', `export const danger = '#ef4444'\n`)

    expect(found.map((f) => f.rule)).toContain('no-hex-colour')
  })

  it('rejects an arbitrary Tailwind value', () => {
    const found = findings('tw.tsx', `export const c = 'rounded bg-[#ef4444] p-4'\n`)

    expect(found.map((f) => f.rule)).toContain('no-arbitrary-tailwind')
  })

  it('rejects a date parsed from a string (P-13)', () => {
    const found = findings('date.ts', `export const d = new Date('2026-07-01')\n`)

    expect(found.map((f) => f.rule)).toContain('no-date-from-string')
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
    const colour = RULES.find((rule) => rule.id === 'no-hex-colour')!

    expect(colour.exempt?.('src/styles/tokens/palette.css')).toBe(true)
    expect(colour.exempt?.('src/routes/home.tsx')).toBe(false)
    expect(colour.exempt?.('src/styles/globals.css')).toBe(false)
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
      'no-hex-colour',
    ])
  })
})
