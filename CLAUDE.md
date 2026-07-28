<!-- openwolf:begin -->
# OpenWolf

@.wolf/OPENWOLF.md

This project uses OpenWolf for context management. Read and follow .wolf/OPENWOLF.md every session. Check .wolf/cerebrum.md before generating code. Check .wolf/anatomy.md before reading files.
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
- **Product language is i18n-driven, not hardcoded.** No user-visible string literal in component code — everything goes through message files, with keys filled for every language the app supports. Which languages those are is a config/product decision, not something enumerated here.

## Design system

Product code consumes **semantic design tokens only** (`--primary`, `--success`,
`--accent-coral`, `--danger`, …) — never raw palette/primitive values. This is
what keeps a rebrand cheap: re-point the semantic layer, touch zero product code.
The brand's signature accent (a single coral dot) has a closed, narrow set of
allowed uses — do not introduce new coral usage without checking the design
reference first.

## Workflow

- A feature/task is done when it's complete — partial work (missing tests,
  missing i18n keys, TODO-flagged edge cases) does not merge as "done".
