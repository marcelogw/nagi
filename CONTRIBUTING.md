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

- [ ] Behaviour matches the feature's spec, including the edge cases it lists
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

A box that genuinely does not apply is marked `N/A` **with the reason**. A
docs-only change has no screenshot; that is worth one word, not a silent tick.

Partial work does not merge as "done". Missing tests, a missing translation and
a TODO-flagged edge case are each enough to hold a PR open.

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

The reviewer checks the diff against the feature's spec and against the failure
modes this project already knows about — from their **own** read of it, not from
what the PR description restates. A PR body is a claim; the review is the check.

Findings are **fixed, or explicitly waived in the PR thread with a reason**.
They are never silently dropped, and "will fix in a follow-up" is a waiver that
needs an issue behind it.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).
