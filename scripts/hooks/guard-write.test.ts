import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

/**
 * Proof that the write guard refuses.
 *
 * The hook is a decision, not advice, so "it is configured" is not a claim
 * worth making — the tooling notes for this project warn specifically that
 * none of this stack had ever been validated together. Each case feeds the
 * guard the exact PreToolUse payload Claude Code sends it and checks the
 * verdict.
 */

type Decision = { permissionDecision: string; permissionDecisionReason: string } | null

function guard(payload: unknown): Decision {
  const output = execFileSync('node', ['scripts/hooks/guard-write.mjs'], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  })

  return output.trim() ? JSON.parse(output).hookSpecificOutput : null
}

const write = (file_path: string, content: string) => ({
  tool_name: 'Write',
  tool_input: { file_path, content },
})

const edit = (file_path: string, new_string: string) => ({
  tool_name: 'Edit',
  tool_input: { file_path, new_string },
})

describe('the guard refuses the write', () => {
  it('rejects a hardcoded colour in product code', () => {
    const decision = guard(write('src/routes/x.tsx', `export const c = '#ef4444'\n`))

    expect(decision?.permissionDecision).toBe('deny')
    expect(decision?.permissionDecisionReason).toContain('no-hardcoded-colour')
  })

  it('rejects a .skip introduced by an Edit into a spec', () => {
    // check-patterns-ignore-next-line: the payload has to contain the banned form
    const decision = guard(edit('src/routes/home.test.tsx', `it.skip('x', () => {})`))

    expect(decision?.permissionDecision).toBe('deny')
    expect(decision?.permissionDecisionReason).toContain('no-skipped-tests')
  })

  // The checker reads `{test,spec}` because P-23 was an end-to-end suite that
  // sat skipped. A guard that reads only `.test.` lets the exact case through.
  it('rejects a .only introduced into an end-to-end spec', () => {
    // check-patterns-ignore-next-line: the payload has to contain the banned form
    const decision = guard(edit('e2e/smoke.spec.ts', `it.only('boots', () => {})`))

    expect(decision?.permissionDecision).toBe('deny')
    expect(decision?.permissionDecisionReason).toContain('no-skipped-tests')
  })

  it('rejects a hand-written shadcn primitive', () => {
    const decision = guard(
      write('src/components/ui/button.tsx', 'export const Button = () => null'),
    )

    expect(decision?.permissionDecision).toBe('deny')
    expect(decision?.permissionDecisionReason).toContain('shadcn CLI')
  })

  it('rejects a domain module written before its test exists', () => {
    const decision = guard(write('src/domain/goal.ts', 'export const x = 1'))

    expect(decision?.permissionDecision).toBe('deny')
    expect(decision?.permissionDecisionReason).toContain('src/domain/goal.test.ts does not exist')
  })

  // The rule whose violation is the path. Nothing in the content could make
  // this file acceptable, which is why the guard is worth more here than
  // anywhere else: the stylesheet is refused instead of written and then having
  // to be found and deleted.
  it('rejects a per-component stylesheet, however clean its contents', () => {
    const decision = guard(write('src/components/card/card.css', '.card {\n  display: flex;\n}\n'))

    expect(decision?.permissionDecision).toBe('deny')
    expect(decision?.permissionDecisionReason).toContain('no-per-component-stylesheet')
  })
})

describe('the guard stays out of the way otherwise', () => {
  it.each([
    ['clean product code', write('src/routes/x.tsx', 'export const c = 1\n')],
    [
      'a colour inside the token files',
      write('src/styles/tokens/palette.css', ':root{--x:#ef4444}'),
    ],
    [
      'a domain module whose test already exists',
      write('src/domain/month.ts', 'export const x = 1'),
    ],
    [
      "a shadcn primitive's render test — the CLI never writes one",
      write('src/components/ui/select.test.tsx', "it('renders', () => {})"),
    ],
    [
      'a tool it does not guard',
      { tool_name: 'Read', tool_input: { file_path: 'src/routes/x.tsx' } },
    ],
    ['the residual style layer, which is where CSS may live', write('src/styles/residual.css', '')],
    ['a file outside the repo', write('/etc/hosts', '#ef4444')],
  ])('allows %s', (_label, payload) => {
    expect(guard(payload)).toBeNull()
  })

  it('never blocks on a payload it cannot parse', () => {
    const output = execFileSync('node', ['scripts/hooks/guard-write.mjs'], {
      input: 'not json',
      encoding: 'utf8',
    })

    expect(output.trim()).toBe('')
  })

  it('normalises the path, so a dot-slash prefix cannot walk past the checks', () => {
    const decision = guard(write('./src/components/ui/button.tsx', 'export const B = () => null'))

    expect(decision?.permissionDecision).toBe('deny')
  })

  it('lets a directive silence the next line only, not the rest of the write', () => {
    // A `break` here would mean one directive disables the rule for everything
    // after it — the permissive failure, which is the one that matters.
    const decision = guard(
      write(
        'src/routes/x.tsx',
        `// check-patterns-ignore-next-line: this one is allowed\n` +
          `const a = '#ef4444'\n` +
          `const b = '#00ff00'\n`,
      ),
    )

    expect(decision?.permissionDecision).toBe('deny')
    expect(decision?.permissionDecisionReason).toContain('#00ff00')
  })

  it('does not reject a banned pattern described in a doc comment', () => {
    // The checker blanks block comments; the guard has to agree, or it rejects
    // what CI accepts and people route around it.
    const decision = guard(
      write('src/routes/x.tsx', `/** Never write '#ef4444' here. */\nexport const c = 1\n`),
    )

    expect(decision).toBeNull()
  })

  it('honours the same ignore directive the checker honours', () => {
    const decision = guard(
      write(
        'src/domain/month.ts',
        `// check-patterns-ignore-next-line: proving the defect\nconst d = new Date('2026-07-01')\n`,
      ),
    )

    expect(decision).toBeNull()
  })
})
