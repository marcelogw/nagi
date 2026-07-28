#!/usr/bin/env node
/**
 * The three agent files say the same thing, or CI says no.
 *
 * `AGENTS.md`, `CLAUDE.md` and `GEMINI.md` are the same rules addressed to
 * three different agents, and they had already drifted into contradicting each
 * other: one said review was optional, another still described a two-locale
 * product. Rules that disagree are worse than no rules, because each agent
 * finds the version that lets it proceed.
 *
 * `AGENTS.md` is the source. The others are copies, byte for byte. If a rule
 * needs to change, it changes there and gets copied — which is one command:
 *
 *   cp AGENTS.md CLAUDE.md && cp AGENTS.md GEMINI.md
 */
import { readFileSync } from 'node:fs'

const SOURCE = 'AGENTS.md'
const COPIES = ['CLAUDE.md', 'GEMINI.md']

export function check(source = SOURCE, copies = COPIES) {
  const expected = readFileSync(source, 'utf8')

  return copies
    .filter((copy) => readFileSync(copy, 'utf8') !== expected)
    .map(
      (copy) =>
        `${copy} differs from ${source}. ${source} is the source; run \`cp ${source} ${copy}\`.`,
    )
}

function main() {
  const problems = check()

  for (const problem of problems) console.error(problem)

  if (problems.length > 0) process.exit(1)

  console.log(`check-agent-docs: ${COPIES.join(' and ')} match ${SOURCE}`)
}

if (import.meta.filename === process.argv[1]) main()
