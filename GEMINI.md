<!-- openwolf:begin -->
# OpenWolf — optional, personal tooling

`.wolf/` is git-ignored (personal, not part of the shared repo). If it exists in your
checkout, read and follow `.wolf/OPENWOLF.md` every session, check `.wolf/cerebrum.md`
before generating code, and check `.wolf/anatomy.md` before reading files. If you don't
have OpenWolf set up, ignore this section — it changes nothing about how a plain session
works here.
<!-- openwolf:end -->

# Git Commit Standard
**Read and obey before executing any git command.**

You MUST write all commit messages in **English** using **Conventional Commits**. Any other format or language is strictly prohibited.

**Mandatory Format:**
`<type>(<scope>): <imperative description>`

`<Body: Explain WHY this change was made and WHAT was done>`

**Rules:**
1. **Allowed types:** `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`.
2. **Language:** Always in English.
3. **NO generic messages** (e.g., "update file", "fix bug").
4. **The BODY is mandatory.** You must explain the context and reasoning.
5. **Imperative mood only** ("add", not "added" or "adds").

**Example:**
```
feat(auth): add login validation

Prevent empty passwords on the login screen and improve security.
```

# Project Overview

**Nagi** (凪 — the calm after the wind stops) is an open-source personal/household
finance app: track income, expenses, savings, and goals with a calm, uncluttered
month-by-month view. Open-core model — the app is fully functional self-hosted
(free); Nagi Cloud is a paid hosted convenience layer on top of the same code.
Only billing is closed-source. License: AGPL-3.0.

## Stack

- Vite + React 19 + TypeScript (`strict`)
- TanStack Router — routes carry navigation state (month/year as URL params, not store state)
- Tailwind v4 + shadcn/ui (Radix primitives) — restyled per the design system, ported on first use
- Zustand + Immer, split by domain — no single mega-store
- `use-intl` for i18n
- Money stored as integer cents, never floats
- Local-first: IndexedDB persistence, no cloud/storage abstraction until a sync layer is actually designed

## Language rules

- **All code, comments, identifiers, commit messages, and technical docs are in English.** This is an open-source project; English is the contribution language.
- **Product language is i18n-driven, not hardcoded.** No user-visible string literal in component code — everything goes through message files.
- **English-first.** `en` is the source locale and the naming authority; `pt-BR` is the first translation, with more to follow. The locale registry is a list, not a pair — adding a language is one file plus one entry. Currency is a **separate setting**, never derived from the language.

## Design system

Product code consumes **semantic design tokens only** (`--primary`, `--success`,
`--accent-coral`, `--danger`, …) — never raw palette/primitive values. This is
what keeps a rebrand cheap: re-point the semantic layer, touch zero product code.
The brand's signature accent (a single coral dot) has a closed, narrow set of
allowed uses — do not introduce new coral usage without checking the design
reference first. Delete/danger is **red (`--danger`), never coral**.

## Design fidelity — do not invent

The design system owns everything the user sees. It is a source of truth, not a suggestion.

- **Never invent a screen, a layout, a component variant, or a flow.** If it is not defined
  in the design system, it does not get built.
- When something needed is **not defined**, stop. Do not approximate, do not fill the gap
  "for now", do not ship a placeholder that looks final. Record the gap, name exactly what is
  missing, and block the work until it is designed.
- **Blocking is the cheap outcome.** An invented screen is a decision made silently, and it
  survives into the product as if someone had chosen it deliberately.
- Follow the approved artefact faithfully. The Visão Mensal anchor owns the final
  proportions; the test for a refactor is "pixel-equal or better than the approved card".
- The same applies to behaviour: if the spec does not define an edge case, it is a question,
  not a judgement call.

## Validation before delivery

Nothing ships on the strength of "it compiles". Before a change is called done:

1. `npm run quality`, `npm run test`, `npm run test:e2e` — all green, nothing skipped.
2. **Exercise the feature for real**, every path: happy path, each edge case in its spec, the
   empty state, the dense state, the error state.
3. **Look at it.** Drive the screen, capture a screenshot, compare it side by side with the
   design artefact and with an existing screen. An agent has no eyes by default — the
   screenshot is the eyes.
4. Both themes, and both breakpoints (the <960px rail → TabBar switch).
5. The pitfalls linked from the feature's spec are verified as *not reproduced*.
6. A second instance reviews the diff before merge.

## Workflow

- A feature/task is done when it's complete — partial work (missing tests,
  missing i18n keys, TODO-flagged edge cases) does not merge as "done".
- **Every change lands via pull request** — no direct pushes to `master` beyond trivial repo
  hygiene. CI must be green to merge, and the diff is reviewed by a second instance.
- If something is genuinely blocked, finish everything that is not, then say plainly what is
  outstanding and why. Scaling the scope down is the maintainer's call, not the agent's.
