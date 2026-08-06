# Decisions

Choices that shape the product and are expensive to reverse, each with the
reason it was made. A decision recorded here is made once; a decision that
lives in a conversation gets remade, differently, every time it comes up.

An entry is dated and never edited into a different decision — a change of mind
is a new entry that says what it supersedes.

The rules that follow from these live where they are enforced: coding
conventions in [`AGENTS.md`](../AGENTS.md), contribution rules in
[`CONTRIBUTING.md`](../CONTRIBUTING.md), vocabulary in
[`glossary.md`](./glossary.md).

---

## Decided

### English is the source language, and currency does not follow it

_2026-07-28_

`en` is the source locale and the naming authority for every identifier, type
and message key. `pt-BR` is the first translation, with more to follow — the
locale registry is a list, not a pair.

Currency is a separate setting. It is never derived from the language and never
hardcoded to one value.

**Why:** an open-source project needs one contribution language, and the
alternative — Portuguese identifiers with English keywords around them — makes
every reader translate before they can read. Tying currency to language is the
same mistake one layer down: a Portuguese speaker in Lisbon does not spend
reais, and someone reading the app in English in São Paulo does.

### Money is stored as integer cents

_2026-07-28_

Every amount in code is `Cents`, an integer. Floats appear nowhere — not in
state, not in storage, not in props. Formatting happens at the edge.

**Why:** `12.30` has no exact binary representation. Summing a month of them
drifts, and a finance app whose totals are off by a cent is wrong in the one
way users notice.

### Delete is red, never coral

_2026-07-28_

Destructive actions use `--danger`. Coral is the brand accent and is not
available to them.

**Why:** the accent appears roughly once per screen and carries the brand.
Spending it on deletion dilutes the accent and makes destruction read as
decoration.

### Notes are out of 1.0

_2026-07-28_

A free-text notes feature is not part of the first release. It stays on the
backlog, deprioritised.

**Why:** the approved monthly view has nowhere to put it, and nothing else in
1.0 depends on it. Adding it would mean redesigning the one screen the whole
app is anchored to.

### Local-first on IndexedDB, with no storage abstraction

_2026-07-28_

Data lives in the browser, through IndexedDB. There is no repository interface,
no storage adapter, and no client for a backend.

**Why:** there is no sync layer designed yet, so an abstraction over storage
would be a guess at an API nobody has specified. It gets designed against a real
backend, or not at all.

The authentication and backend technology for hosted sync is **not chosen**.
That decision needs its own entry here, written when the work starts.

### Local storage sits behind a `StorageAdapter`

_2026-08-06 · supersedes "Local-first on IndexedDB, with no storage abstraction" (2026-07-28)_

Where local state persists is now a formalised contract:
`src/persistence/storage-adapter.ts` defines `StorageAdapter`, a small
get/set/remove-plus-backup interface. `indexedDbAdapter`
(`src/persistence/db.ts`) is the only implementation and the only one wired
up — there is no registry and no user-facing backend choice.
`settings-store.ts` stays on `localStorage`, outside the contract: the theme
has to be read synchronously before React mounts, and IndexedDB is async.

**Why:** the previous entry's reasoning still holds for *sync* — no backend
is chosen, so a sync interface would be a guess. It does not hold for
*swapping where local data lives*: this is an open-source project, and adding
or replacing a local storage backend (OPFS, SQLite-wasm, a Node adapter for a
self-hosted server variant) should be a contained, one-file change. The seam
already existed implicitly, through Zustand's `persist({ storage })` option —
this decision formalises it rather than inventing something new.

Remote sync (Nagi Cloud) remains a separate, still-undesigned `SyncAdapter`
seam layered above this one. Authentication and backend technology for it
remain unchosen, unchanged from the superseded entry.

### Tailwind is the styling language for all product code

_2026-08-06_

Every component in `src/` is styled with Tailwind utilities over the design
tokens. There is no hand-written `.css` per component and no CSS Modules.
`src/components/ui/` stops being an exception and becomes the norm — the whole
tree speaks one styling language.

Three things follow from it, and they are part of the decision, not
implementation detail:

1. **Tailwind's default colour palette is cleared** (`--color-*: initial` in
   `@theme`). Only the semantic roles exist as utilities. `bg-gray-100` then
   generates nothing and breaks visibly, instead of rendering a plausible
   off-system grey nobody catches in review.
2. **The type scale is exposed under semantic role names** — `text-body`,
   `text-title`, `text-display`, mirroring the roles `typography.css` already
   documents. No t-shirt sizes: Tailwind's `text-base` is 16px and this
   design's body is 14px, and a utility whose name disagrees with its value is
   a trap. The `--text-*` tokens keep their current names, because the design
   repo symlinks `src/styles/tokens/` and the mockups read them directly.
3. **A small `.css` layer survives, and that is honest, not an escape hatch.**
   It holds what Tailwind genuinely cannot express — `@keyframes`, `mask:` on a
   pseudo-element, `env(safe-area-inset-bottom)`, `color-scheme` — and nothing
   else. A component style that lands there instead of in a `className` is a
   defect.

**Why:** two reasons survived scrutiny; several popular ones did not.

*An off-scale value has to announce itself.* Tailwind forces one into a marked
syntax — `w-[13px]`, `tracking-[-0.01em]` — which is greppable, so design drift
is machine-detectable. Hand-written CSS has no such marker: `width: 13px` is
indistinguishable from any other line. This is a structural property of the
tool, independent of any linter written around it. It was not theoretical when
this was decided: the CSS written the same week already carried `gap: 2px`
(off the 4px grid), `letter-spacing: -0.01em` (`--tracking-tight` exists and is
-0.02em), and four bare pixel sizes — none of which any check could see.

*This codebase is written end to end by AI, and the two approaches fail
differently.* Hand-written CSS fails silently in the ways an LLM fails most:
an invented `var(--text-md)` is dropped with no error and renders a wrong page;
a class name that disagrees between the stylesheet and the JSX applies nothing;
dead rules survive every deletion because cleanup requires remembering. Tailwind
removes the two-file synchronisation entirely, removes the naming step, deletes
styles with the component, and — once the default palette is cleared — turns an
invented utility into a visible break rather than a plausible one. The base
utility vocabulary is also among the most heavily represented code there is,
which is where hallucination is lowest.

**Considered and rejected:**

- **CSS Modules** — solves scope, dead code and co-location for the price of
  three renamed files and zero dependencies, and keeps the design's CSS
  vocabulary. Rejected on the two reasons above: it still has no marker for an
  off-scale value, and it keeps the two-file synchronisation that is the
  dominant LLM failure mode. It was the strongest alternative.
- **Plain CSS + BEM (the status quo)** — same objections, plus scope isolation
  by discipline rather than by build.
- **UnoCSS** — its headline feature is that `m-13` generates `margin: 13px`
  with no configuration and no brackets. That deletes the marker this decision
  rests on, and makes an arbitrary value indistinguishable from a scale
  utility. It also keeps every cost Tailwind has here while trading Tailwind's
  ecosystem and corpus representation for a niche, and adds compatibility risk
  against a `src/components/ui/` generated by the shadcn CLI. Two of the three
  advantages usually claimed for it (no JS config, build speed) describe
  Tailwind v3; this project is on v4, which has no `tailwind.config.js` at all.

**What this decision does not rest on**, recorded because both arguments were
made and both were wrong: that the mockups in the design repo are written in
plain CSS, and that Tailwind's naming collides with the type scale. The first
is a consequence of the stack never having been decided, not evidence for a
stack; the mockups already require translation into components and tokens, so
the extra step is a one-time learning curve, not a per-line tax. The second is
a solvable naming problem, and solving it (point 2 above) leaves the scale
better named than it was. Neither may be cited to reopen this.

**Bundle size did not enter the decision** in either direction: the CSS ships
at 4.7 KB gzipped against a 50 KB budget.

---

## Open

Each of these has to be settled before the feature it belongs to is built —
not during, and not in code.

### How charts are drawn

_Raised 2026-07-30 · decide before the dashboard is built_

Either the charts are hand-drawn in SVG and CSS, as the design defines them, or
they use a charting library.

The design already specifies the shapes, the track, the gaps between segments
and the fixed order of the series, so most of what a library provides is
already decided and would have to be overridden. Leaning to SVG and CSS: it
drops a heavy dependency and keeps the a11y rules that come with the design.

Aggregation is a pure function either way, so nothing is blocked meanwhile.

### Whether an expense date carries a day

_Raised 2026-07-30 · decide before expenses are built_

An expense stores a full `YYYY-MM-DD`, but the day may be meaningless: a
recurring expense belongs to a month, not a date in it.

Either the day is kept and the user picks it for one-off expenses — the field
exists and a dated expense is more useful later — or the model drops to month
precision and says so. What is not acceptable is a date field silently filled
with the first of the month while the UI implies the user chose it.

### Whether an installment plan can be edited

_Raised 2026-07-30 · decide before installments are built_

A plan has a card, a total number of installments, an amount and a start month.
Editing one changes every month it touches, including months already reviewed.

Either editing is supported and the recalculation is specified, or it is not
supported and the UI says so plainly. Silently offering no edit is how a user
ends up deleting and rebuilding a twelve-month plan to fix a typo.

### What the goal status `ahead` means

_Raised 2026-07-30 · decide before goals are built_

The name says a goal is ahead of schedule. Its intended meaning is that the
target amount is already reached while the goal is still marked active — which
is not the same thing, and leaves a genuinely ahead-of-schedule goal reported
as merely on track.

Either rename it `reached`, which is what it detects, or implement it as a real
comparison against the deadline. The name and the behaviour have to agree
before either reaches a screen.
