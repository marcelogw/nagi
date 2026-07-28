# Contributing to Nagi

Thanks for taking a look. Nagi is early — parts of this guide will get more
specific as the app itself gets scaffolded. The rules below already apply.

## Language

- Code, comments, identifiers, commit messages, and technical documentation:
  **English only**.
- Product UI strings never live in component code. They go through the app's
  message files, and a new string is added to **every** locale in the same PR.
  `en` is the source locale; `pt-BR` is the first translation, with more to
  follow — the locale registry is a list, not a pair.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), in English,
with a body explaining *why*:

```
<type>(<scope>): <imperative description>

<why this change was made, what it does>
```

Allowed types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`.
No generic messages ("update file", "fix bug").

## Definition of done

"Done" is not an opinion. A change is done when **every** applicable box is
ticked — not most of them.

- [ ] Behaviour matches what the issue asks for, including the edge cases it lists
- [ ] Zero hardcoded user-visible strings; the keys exist in every message file
- [ ] Pure logic lives in `src/domain/` and is unit tested, branches included
- [ ] Every Radix-based component has a render test that opens it
- [ ] The route has an end-to-end smoke test driving its primary user action
- [ ] `npm run quality` passes (lint · typecheck · format)
- [ ] `npm run test` passes
- [ ] `npm run test:e2e` passes
- [ ] The screen matches the design system — nothing invented
- [ ] A screenshot of the new UI was reviewed against an existing screen
- [ ] Both themes, and both breakpoints (the 960px nav-rail ↔ tab-bar switch)
- [ ] A second instance reviewed the diff before merge

A box that genuinely does not apply stays **unchecked**, with `— N/A: <reason>`
appended. A docs-only change has no screenshot; that is worth one clause, not a
silent tick and not a deleted line.

> `npm run test:e2e` runs Playwright against Chromium and starts the dev server
> itself — no separate terminal, no manual step. First run on a clean clone
> needs the browser once: `npx playwright install chromium`.

Partial work does not merge as "done". Missing tests, a missing translation and
a TODO-flagged edge case are each enough to hold a PR open.

## What the linters refuse

Four patterns are rejected outright, because each one is a defect the app Nagi
replaces actually shipped. They are errors, not conventions, because a
convention is a thing people mean to follow.

| Rejected | Why | Instead |
| --- | --- | --- |
| A user-visible literal in JSX | A fully translated set of keys once sat unused above 700 lines of hardcoded text | A translation key |
| A hardcoded colour — `#ef4444`, `rgb(…)`, `hsl(…)` — or an arbitrary Tailwind value like `bg-[#ef4444]` | This is how a design system drifts, one component at a time | A semantic token, or a scale utility |
| `new Date('2026-07-01')` or `Date.parse('…')` | Parses as UTC midnight, which is the *previous day* here | Build from parts, or `src/domain/month.ts` |
| `.sort()`, `.reverse()`, `.splice()` | A value read from a store selector **is** the store's state, so sorting it sorts the store | `toSorted()`, `toReversed()`, `toSpliced()` |
| `.skip` or `.only` in a committed spec | A skipped suite looks exactly like coverage from the outside; `.only` quietly stops running everything else in the file | Delete it, or fix it |

Three more checks run alongside them, all inside `npm run quality`:

- **Message catalogues agree.** Every locale defines exactly the keys `en.json`
  defines — a key added to one file only fails the build. `en` is the source
  locale and the naming authority.
- **No key is defined but never referenced.** A translated set of keys nothing
  uses is not translation, it is a maintenance cost with a good disguise.
- **`AGENTS.md`, `CLAUDE.md` and `GEMINI.md` are byte-identical.** They are the
  same rules addressed to three agents, and they had already drifted into
  contradicting each other. `AGENTS.md` is the source:
  `cp AGENTS.md CLAUDE.md && cp AGENTS.md GEMINI.md`.

`npm run check:bundle` runs after the build and holds gzipped output to a
budget. It is a tripwire for a dependency that arrived by accident, not a
performance target — raising it belongs in a commit that argues for it.

CI runs `npm run quality` as **one step**, the same command you run locally.
Splitting it is how the two drift until CI checks something nobody can
reproduce.

The escape hatch is one line, and it needs a reason:

```ts
// check-patterns-ignore-next-line: writing the banned pattern is the point here
const parsedAsUtc = new Date('2026-07-01')
```

`rg check-patterns-ignore src` is the complete list of places this project
knowingly writes one of these. It should stay short enough to read in one go.

Every rule has a test that watches it reject a deliberate violation
(`scripts/enforcement.test.ts`). Adding a rule without one fails that suite —
configuration nobody has seen reject anything is not enforcement.

### If you work through an agent

`.claude/settings.json` is committed and installs a `PreToolUse` hook that runs
`scripts/hooks/guard-write.mjs` before every Write and Edit. It refuses:

- a write that introduces one of the patterns above
- a hand-written file in `src/components/ui/` — those come from the shadcn CLI,
  and a hand-edited one is either overwritten by the next `shadcn add` or, worse,
  quietly diverges from it
- `src/domain/x.ts` when `src/domain/x.test.ts` does not exist. The domain layer
  is written test-first: pure functions whose spec already exists have no excuse
  for test-after

It adds no rule that `npm run quality` does not already enforce, and it imports
the rule list from the same file rather than restating it — a second copy drifts,
and the copy that drifts is always the one that lets the bad write through. What
it changes is *when* you find out: at the keystroke instead of on the pull
request. A skill advises; a hook decides.

Personal overrides go in `.claude/settings.local.json`, which is git-ignored.

Each rule's known blind spots are written next to it in
`scripts/check-patterns.mjs`. The largest: a date built from a string
*variable*, and `push`/`pop`/`fill` on a value read from a store. Both need
type information to catch, so neither is claimed to be covered.

## Tests

Four layers, and something belongs to exactly one of them.

| Layer | Covers | Rule |
| --- | --- | --- |
| **Domain** (`src/domain/`) | Money, months, recurrence, goals, totals | Pure functions. No React, no storage, no i18n, no mocks. |
| **Store** (`src/stores/`) | Actions, invariants, state transitions | Drive the real store; assert the resulting state, never the calls made. |
| **Component** | Rendering, interaction, accessibility | Testing Library through `src/test/render.tsx`. Query by role and label, never by class. |
| **End-to-end** | One primary flow per route | `data-testid` selectors only, never user-visible text. |

There is a worked example of each in the repo — `src/domain/month.test.ts`,
`src/stores/settings-store.test.ts`, `src/routes/shell.test.tsx`,
`e2e/smoke.spec.ts`. Copy the nearest one rather than inventing a new shape.

A component test that needs a route renders through `renderRoute()` from
`src/test/render.tsx`, which mounts the app's real route tree over a memory
history. A test-only tree would pass while the real one redirected elsewhere.

**The suite runs under `TZ=America/Sao_Paulo`**, set in `vite.config.ts` and on
the CI job. This is not a preference. Parsing a date-only string with
`new Date('2026-07-01')` yields UTC midnight, which is the *previous day* in any
timezone west of Greenwich — the defect family that did the most damage in the
app Nagi replaces. Under UTC it is invisible, so the suite refuses to run there:
flip the timezone and `src/domain/month.test.ts` goes red on purpose.

**Anything that reads the clock is pinned with `vi.setSystemTime()`.** Current
month defaults, goal status, `createdAt`. A test that passes only in July is not
a test:

```ts
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 6, 15)) // local time, never a date string
})
afterEach(() => {
  vi.useRealTimers()
})
```

**Every Radix-based component gets a render test that opens it.** Radix enforces
invariants TypeScript cannot see — a `SelectItem` may not have `value=""`, a
`Dialog` needs a title. Only rendering surfaces them.

**A number shown to the user is covered by a unit test.** If a value reaches the
screen, something asserts it.

`npm run test:coverage` reports coverage. Only generated code and
`src/components/ui/` are excluded, and that list does not grow: a module that is
hard to test is a design problem to fix, not a line to add to an exclude list.
Read the percentage as a smoke alarm, not a target — it only sees files some
test already imports, so a brand-new untested module is invisible to it.

## Validation before delivery

Nothing ships on the strength of "it compiles".

1. `npm run quality`, `npm run test`, `npm run test:e2e` — all green, nothing
   skipped. A `.skip` is deleted or fixed, never committed.
2. **Exercise the feature for real**, every path: the happy path, each edge case
   in its spec, the empty state, the dense state, the error state.
3. **Look at it.** Drive the screen, capture a screenshot, and compare it side by
   side with the design artefact and with an existing screen. Agents have no eyes
   by default — the screenshot is the eyes, and this step is not optional for
   anything a user can see.
4. Both themes, and both breakpoints.

## Design fidelity — do not invent

The design system owns everything the user sees. It is a source of truth, not a
suggestion.

- **Never invent a screen, a layout, a component variant, or a flow.** If the
  design system does not define it, it does not get built.
- Follow the approved artefact faithfully. The test for a refactor is
  "pixel-equal or better than the approved screen".
- The same applies to behaviour: if the spec does not define an edge case, that
  is a question, not a judgement call.
- Product code consumes **semantic design tokens only** (`--primary`,
  `--success`, `--danger`, …) — never a raw hex or an arbitrary Tailwind value.
  That is what keeps a rebrand cheap.

### When the design does not define what you need

Stop. Do not approximate, do not fill the gap "for now", and do not ship a
placeholder that looks final.

1. Record the gap and name **exactly** what is missing — the screen, the state,
   the variant, the copy.
2. Say so on the issue or the PR, and stop that piece of work.
3. Finish everything in the change that is **not** blocked, and say plainly what
   is outstanding and why.

**Blocking is the cheap outcome.** An invented screen is a decision made
silently, and it survives into the product as if someone had chosen it
deliberately. Scaling the work down is the maintainer's call, not yours.

## Pull requests

- **Every change lands via PR** — no direct pushes to `master` beyond trivial
  repo hygiene (typo fixes, config with no behaviour change).
- `master` is protected: CI must be green before merge.
- A PR is one complete, reviewable unit of work.
- A PR is about **the change and its evidence**, not about where the change sits
  on a board. Fill in `.github/PULL_REQUEST_TEMPLATE.md`: what changed, how it
  was verified, and the checks.

### Review protocol

Every PR gets a **second-instance review before merge** — a second contributor,
or for agent-driven work a second model (`/code-review`, or the
`agy-code-review` skill for an independent one). The author is never the sole
reviewer of their own change.

The reviewer checks the diff against the issue it closes, and against the failure
modes this project already knows about — from their **own** read of both, not
from what the PR description restates. A PR body is a claim; the review is the
check.

Findings are **fixed, or explicitly waived in the PR thread with a reason**.
They are never silently dropped, and "will fix in a follow-up" is a waiver that
needs an issue behind it.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).
