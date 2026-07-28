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
      'a tool it does not guard',
      { tool_name: 'Read', tool_input: { file_path: 'src/routes/x.tsx' } },
    ],
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
