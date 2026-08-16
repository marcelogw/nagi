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

### Tags are a second taxonomy, orthogonal to categories

_2026-08-16_

A category answers *what kind of operation this was* — groceries, fuel, rent.
It is single-valued and mandatory. A tag answers *what context it belonged to*
— a trip, a renovation, a side project. It is multi-valued and optional, and it
is created freely by the user rather than picked from a list the app ships.

The two never merge. A trip has groceries and fuel in it; collapsing context
into the type hierarchy is how a category list grows to sixty entries and stops
classifying anything. Keeping them separate is what makes "everything I spent
on this trip, broken down by kind" a question the app can answer at all.

A tag is an entity, not a bare string on the entry: a string cannot carry the
colour the design may add later, and cannot be renamed without rewriting every
record that mentions it. Its id is its own normalised slug rather than a
surrogate `Uuid` — the slug is unique, deterministic and immutable, which is
the definition of a key, and it keeps the JSON export readable, which matters
in an app whose backup is a first-class feature.

Tags apply to income, expenses, installment plans and recurrence templates.
Not to savings entries — a goal already models "money set aside for something".

The rules are specified in [`specs/tags.md`](./specs/tags.md).

### Every entry has a name and an optional description

_2026-08-16_

The free-text label of a thing had four different names: `name` on
`CreditCard`, `Installment` and `Goal`; `description` on `Income`, `Expense`
and `RecurrenceTemplate`; `customLabel` on `Category`; and `source` plus `note`
on `SavingsEntry`. [`glossary.md`](./glossary.md) opens by requiring one name
per concept, and this was four.

Every entry now carries a required `name` — what the thing is, "new running
shoes" — and an optional `description` for anything worth remembering later,
"for the Japan trip, bought at the mall". `SavingsEntry.source` becomes `name`
and `note` becomes `description`; the origin of the money is a name like any
other, and a third free-text field is a question the user has to answer on
every single entry.

Decided now because it is free now: apart from categories and cards, no entity
has any stored data yet. After the ledger ships this is a migration plus a form
change with users on the other side of it.

`description` is not shown on the monthly row — `ListRow` is `title` plus a
`meta` line that is already *date · category*, and it is approved design. It
surfaces in the entry's info panel and in search results, and it is searchable.
A field that is never read back would not be worth its cost at entry time.

### An entry's date carries a day, and income has one

_2026-08-16 · closes "Whether an expense date carries a day" (raised 2026-07-30)_

`Expense.date` keeps day precision. `Income` gains the same field, required.

Income having only a month was the real defect: any screen that lists income
and expenses together in time order — search, a tag's history — has nothing to
sort half its rows by, and the asymmetry buys nothing.

No time of day. Time means time zones, in a local-first app that will sync
across devices, and nobody reconciles household finance by the hour. The hour
the user actually wants is "when did I enter this", which is `createdAt`.

Every entry carries `createdAt` and `updatedAt`. These are the one kind of
field that cannot be backfilled honestly: added later, every existing record
gets an invented timestamp and the info panel lies about it forever. Authorship
is deliberately *not* added — it is backfillable (in single-user storage every
record is the one user's), so it waits for the feature that needs it rather
than sitting null in the model.

### The future is bounded by a stored horizon, not materialised

_2026-08-16_

A recurrence is one rule with occurrences derived per month, never rows written
ahead (`P-04`), and it can be open-ended (`P-07`). Both are settled. What was
missing is where derivation stops: without a bound, "the total for this tag" is
an unbounded sum, because a rule expands into any month it is asked for.

A single stored `Month` — the horizon — is how far the app looks. Months beyond
it are not navigable and are never derived. The user moves it forward
deliberately, it advances on its own at the turn of the year, and creating an
installment plan that ends past it pushes it out to cover the plan.

An installment plan is the exception, and because it is finite rather than
because it is long: its schedule is fully determined at creation
(`startMonth + totalInstallments`, capped at 48). It is summed in full even
beyond the horizon, which is what makes "what did this trip cost" correct when
the trip was paid in twelve instalments. An open recurrence has no such end and
is never expanded past the horizon.

Realised and forecast are shown as separate figures, never added into one
number.

### Analytics functions take a set of entries, never a store and a period

_2026-08-16_

Every aggregation in `domain/analytics.ts` receives an already-filtered list of
entries. Filtering is the caller's job: the dashboard filters by window, a tag
view filters by tag, a category or card view will filter by its own facet.

The dashboard is windowed by period and a tag spans arbitrary, non-contiguous
months. If these functions are written to the dashboard's shape — store plus
period — no other view can reuse them and the arithmetic gets written twice,
which is the exact duplication EPIC-010 exists to prevent.

This also settles the shape of the analysis screen. It is not "the tag screen":
it is the analysis view of a facet — header totals, distribution by category,
change over time, the list of entries. Tags are its first instance; categories
and cards become instances when they gain the same treatment. One screen gets
built now, with no generic abstraction over facets — the generalisation belongs
to the second instance, where what actually varies is visible.

### A row's trailing actions are handlers, never a slot

_2026-08-16_

`ListRow` takes `onEdit` and `onDelete`. It does not take an `actions` slot, an
`actions` array, or children on the trailing edge.

The approved Visão Mensal anchor fixes the whole presentation — the order
edit → delete, the danger tone on delete, the confirmation, the reveal on
hover, the swipe on touch, the `…` fallback where neither exists, and an
`aria-label` built from the row title. A slot hands all of that to the caller,
and the caller is a different screen every time. Delete was already coral on
four cards once and had to be corrected repo-wide; a slot is how that comes
back one screen at a time.

Closing the set at two is deliberate. A third action is a design question — an
array of `RowAction` is the upgrade path when one actually exists, and it keeps
the row as the owner of the behaviour.

Recorded with it: `ListRowProps` was behind the anchor by three things, not
one. `recurring` (↻) and `installment` (`3/12`) were in the approved artefact
and missing from the contract. Both are neutral by the coral rule — they repeat
across many rows, so neither can be the screen's single accent — and both now
sit on the title line, which truncates around them. The ↻ is 12px in the
anchor, below the icon scale, so it gained a token (`--icon-2xs`) rather than
staying an arbitrary value.

### A tag is not marked on the monthly row

_2026-08-16_

Tags are read in the entry's info panel. The row shows no tag glyph.

The specification originally put one there, reasoning from the `↻` precedent —
and put it in the `meta` line while claiming to follow a marker that lives on
the *title* line, so the placement was never coherently specified either way.

Both spots lose, but the placement is the smaller half. The precedent argues
against the marker at either one: `↻` and `3/12` mark what an entry *is*, and
the marker is the whole fact. A tag is a membership — one glyph cannot say
which tag or how many, so wherever it sits it raises a question instead of
answering one.

The cost is accepted and named: an entry's tags are invisible until the panel
is opened, and a month cannot be scanned for tagged entries. That scan is the
analysis view's job, which does it better than a glyph would. Reversible — the
marker is one prop if use shows the gap hurts.

This makes the info panel load-bearing, and raises the question of what opens
it. That is now an open design blocker on `docs/specs/tags.md`, not an
implementer's judgement call.

### The info panel is a Modal, opened by a third trailing action

_2026-08-16_

An entry's info panel is a centered `Modal` on desktop and `Sheet side="bottom"`
below 960px, opened by an `info` action that leads the row's trailing set:
`info` → `square-pen` → `trash-2`.

Neither half is new. `Sheet.prompt.md` already documents that pairing for the
"Novo lançamento" flow, and the card-detail overlay is already a `Modal`; the
Cartões card head already carries that exact action triple, which is where the
system answered "how does a user open an entity's detail view". Both answers
existed and had simply never been pointed at this screen. Introducing a
`Popover` to host the panel, or a row-body tap to open it, would each give one
product a second idiom for a job it had already settled.

The row-body tap also fails on its own terms: the trailing buttons are in the
DOM on desktop, so a row that is itself a button nests interactive elements —
invalid, and it leaves a screen reader unable to announce any of the three.

On touch the three actions ride the existing swipe at 44px each — the system's
touch-target floor, not the 56px the foundation used for two. Three generous
targets eat the line the user needs in order to know which row they are acting
on, and 44px is a number this system already documents rather than a new one.

The resulting 132px is exactly what the Cartões grid shows permanently under
`@media (hover:none)`, which makes the difference precise: revealed on demand,
the money axis holds until the user asks; permanent, it is displaced always,
and not displacing it is the rule row actions exist under. A card has no axis
on that edge; a row does.

**This exercises the upgrade path named on 2026-08-16 and declines it.** The
third action arrived, and the contract stays three named props rather than
becoming `RowAction[]`. The set is still closed and still fixed in order; an
array's only new capability is letting a caller reorder or substitute, which is
precisely what closing it prevented.

### `ListRow` has a `dense` variant; density is vertical only

_2026-08-16_

The design system described the same `ListRow` twice, and nothing said which
one had authority. The approved Visão Mensal anchor drew it at `8px 9px`
padding, `10px` gap and a `--text-xs` meta line; the component showcase drew it
at `--space-3` padding, `--space-3` gap and a `--text-base` meta line. Neither
artefact cited the other, so "follow the anchor" and "follow the showcase" were
both defensible readings of the same contract.

`dense` names the difference instead of picking a winner. The Visão Mensal is
denser than the showcase on purpose — it stacks a whole grouped month, where
the showcase stacks three rows inside a card — so the divergence was a real
distinction that had never been given a name. Migrating either one onto the
other loses something true: the anchor is the proof of the whole system and
would lose its density, and the showcase would have to import four off-grid
pixel values into the component contract.

**The variant changes the block padding (`--space-2` instead of `--space-3`)
and the meta size (`--text-xs` instead of `--text-base`), and nothing else.**
The gap, the icon tile and the title are identical in both, so the text axis
and the money axis land on the same x either way. That is the constraint that
keeps this one component rather than two: shared axes are what let two lists
sit on one screen without disagreeing, so a density knob may buy vertical room
and may not move a column.

The four off-grid values are gone with it — `9px` and `10px` and the two inner
gaps snap to `--space-2` / `--space-3` / `--space-1`, and the `1px` gap between
the title and meta lines is deleted rather than tokenised, because two lines
with their own line-heights do not need one. The largest change any row sees is
two pixels.

One consequence worth stating: the anchor artefact already used the word
`dense` for an unshipped exploration toggle in its own control panel, tighter
than either variant. That knob is now `compact`, matching the Portuguese label
it already showed, so the vocabulary means one thing.

### The tag input keeps its chips outside the field, and creates on an exact miss

_2026-08-16_

`TagInput` is the one place a tag is attached to an entry or brought into
existence. Almost none of it is new: the suggestion menu is the `Select` menu
unchanged, filtering a set as you type is the category dialog's icon picker,
rejection is `Input`'s own `invalid` and `hint`, and a chip is `Badge` with a
new `onRemove`. Three things were genuinely missing, and only those three are
decided here.

**The attached tags render below the field, not inside it.** A token field
changes height as the user types, which no other field in this product does,
and it would fork `Input` — a single `<input>` by contract. Below the field the
chips wrap freely, the field stays one calm line, and each remove target is a
real button instead of a glyph wedged into a text field, which is also the only
version that works on touch. Backspace on an empty query still removes the last
chip: that accelerator never depended on where the chips were drawn.

**The create row appears on an exact-slug miss, not on "no results".**
Filtering is a substring match; creating is an exact miss. Typing `viagem`
while only `viagem-japao` exists shows that match *and* offers to create
`viagem`. Tying the row to "nothing matched" would make every tag that is a
prefix of another one uncreatable, which is a dead end the user cannot even see
the shape of. It still cannot produce a duplicate — the row hides precisely
when the slug is taken — and that was the whole point of the original rule.
The row is always last: above a match it would be the highlighted default, and
attaching an existing tag is the common act.

**The live slug preview lives in the create row's trailing slot** — the place
the `Select` menu already reserves for a trailing fact. It is on screen exactly
while a new tag is being made, which is the only moment normalisation can
surprise anyone, and when the text resolves to a tag that exists the matched
row says the same thing by showing that tag. A permanent hint line under the
field would restate the menu and shift the layout on every keystroke.

Only Enter and a click commit. Space never does: `viagem japao` normalises to a
single slug on purpose, so a committing space would make the two-word tag
unreachable from the keyboard.

`Badge.onRemove` is where the chip lives rather than a new component, on the
same rule `ListRow` follows: the caller supplies the handler, the component
owns the affordance. That is what keeps one remove control across every screen.
Its hit area reaches the 44px touch floor through an overlay rather than by
sizing the chip — six tags at 44px tall would shout on a form meant to stay
calm. Removing is not deleting, so the control is neutral and confirms nothing;
deleting the tag itself is a different act on a different screen, in danger
tone and behind a confirmation.

### Catalogue is a grouping, and it needed no new screen

_2026-08-16_

`Categories`, `Cards` and `Tags` sit behind one **Catalogue** grouping. It has
no route, nothing navigates to it, and the active destination is always one of
the three leaves.

The forcing function was the tab bar: five items is the documented ceiling in
both major mobile guidelines, and tags is the sixth destination. Grouping beats
squeezing because the three really are one kind of thing — reference data the
user maintains, and all three are expected to gain the analysis treatment tags
get — so the grouping will not have to be reopened when they do.

**What made it closeable is that neither half was new.** `NavRail` has drawn an
overline section label since it was written; it simply had one section, so a
group is a second one rather than a new component. `TabBar` has always carried
the rule "4–5 items max, overflow the rest into one destination"; this uses it
instead of reinventing it. The obvious alternative — a Catalogue hub screen
listing three sub-destinations — would have been an invented screen and a row
type the system does not have, and it would have had to stay blocked.

**The rail shows the three inline; the tab bar puts them one tap away.** A
vertical rail has no ceiling, so hiding the children behind a click there would
buy a navigation step to solve a problem desktop does not have. The bar opens a
`Sheet side="bottom"` listing the same nav items the rail draws — one
component, two hosts, so the sheet invents no row either. Both navs therefore
present one tree, and this is the only place they are allowed to differ.
Collapsed at 64px a group label becomes a `--border` rule: the grouping
survives, its name does not.

The name matters. "Catalogue" says what is inside; a generic "Mais" says only
that something did not fit, which is what turns an overflow bucket into a junk
drawer.

**One consequence, decided with it: tags' glyph is `Hash`, not `Tag`.**
Categorias is `Tags` and tags was `Tag` — an assignment that only ever had to
avoid a collision. Grouping put the two one item apart inside the same section,
where the silhouettes are the same shape at `--icon-md`, and the collapsed rail
keeps no label to separate them. `Hash` is the hashtag convention this
feature's normalisation is already argued from, so it says the right thing
rather than merely differing from its neighbour.

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
