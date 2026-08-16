# Tags, search and facet analysis

The rules. The reasoning is in [`../decisions.md`](../decisions.md) under "Tags
are a second taxonomy, orthogonal to categories" and the four entries that
follow it; this file does not repeat it.

Nothing here is built yet. It is specified ahead of EPIC-005 (Ledger) because
the fields land in `domain/entities.ts` with that phase — added afterwards they
are a persistence migration instead.

## The model

```ts
type TagId = Branded<string, 'TagId'>   // the slug itself, not a Uuid

type Tag = {
  id: TagId          // = the normalised slug, immutable
  label: string      // as the user typed it, for display
  createdAt: Timestamp
}
```

`Tag` lives in `catalog-store`, next to `Category` and `CreditCard` — same kind
of user-managed reference data, same lifecycle.

`tagIds: TagId[]` is embedded on the entry. There is no join table: the store is
a blob, so there is nothing to join with, and the reverse lookup (which entries
carry a tag, how many) is a memoised inverted index built in a selector.

`label` exists so `Japão` displays with its accent while `japao` is the key. It
is user data, never a message-catalogue key — the i18n rules govern the chrome
around a tag, never the tag itself.

## Normalisation

One function, in `domain/tags.ts`, applied at creation and at every lookup:

1. Unicode NFD, then drop combining marks — `café` → `cafe`
2. lowercase
3. replace every run of non-letter, non-number with `-` — `/[^\p{L}\p{N}]+/gu`
4. collapse repeated `-`, trim `-` from both ends

```
"Viagem Japão 2026!"  →  viagem-japao-2026
"  reforma   casa  "  →  reforma-casa
"日本"                 →  日本
"R$ 1.000"            →  r-1-000
```

Step 3 keeps any Unicode letter rather than only `a-z`. A rule that kept ASCII
alone would normalise `日本` to the empty string, and this project's locale
registry is a list, not a pair. This is the hashtag convention, and it is the
most widely exercised tag normalisation there is.

Separators are **not** folded: `viagem-japao` and `viagem japao` both become
`viagem-japao`, but a user who writes two distinct words meant two words.

- **Empty after normalisation** — reject with a message. `"!!!"` and an
  emoji-only tag both hit this.
- **Longer than 50 characters** — reject. Matches GitHub topics; generous
  enough that no real tag meets it and small enough that no chip breaks.

The input shows the resulting slug live as the user types. Aggressive
normalisation is honest when the user watches it happen and surprising when
they do not.

## Lifecycle

**Create.** Only where creating is the literal intent — the tag management
screen. On an entry, typing filters the existing tags and "create new" appears
only when no slug matches. A duplicate is therefore impossible on the path
users are actually on, rather than an error they have to read.

**Rename.** Not supported. Renaming into a name that already exists is a merge,
merging is a data rewrite, and neither has a use case yet that beats the cost of
specifying it. Revisit if real use asks for it.

**Delete.** Removes the tag from every entry that carries it. There is no
reassignment target and none is needed — unlike a category, a tag is optional,
so an entry without one is a valid entry. Confirm before deleting and state the
count ("this removes the tag from 47 entries"); offer undo through the toast the
design already specifies.

**Orphans.** A tag used zero times is kept. Deleting it automatically would
punish a user who deleted one expense and meant to reuse the tag. The tag list
sorts by usage, so unused tags sink on their own — which is the whole of the
cleanup this needs.

No cap on tags per entry. A cap normally protects a layout, and tags are not
rendered on the monthly row.

## Where tags apply

| Entity | Tags | Note |
| --- | --- | --- |
| `Income` | yes | |
| `Expense` | yes | |
| `Installment` | yes | on the plan; every occurrence inherits |
| `RecurrenceTemplate` | yes | occurrences inherit |
| `SavingsEntry` | no | a `Goal` already models money set aside for something |

A recurrence's occurrences inherit the rule's tags. A single month diverging
goes through the existing `RecurrenceException` — `override: Partial<RecurrenceTemplate>`
covers `tagIds` with no new concept, because `tagIds` is on the template.

Without tags on the rule, a twelve-month subscription would have to be tagged
by hand in each month, and future months would keep arriving untagged forever —
losing tags exactly where a stable context makes them most useful.

## Search

Three tag operators, combinable:

| Operator | Matches |
| --- | --- |
| `ANY` | carries at least one of the selected tags — "every trip" |
| `ALL` | carries all of them — `viagem` + `japao` |
| `NOT` | excludes |

`EXACTLY` (the entry's tag set equals the selection) is deliberately absent: it
reads identically to `ALL` in the UI, and nothing needs it.

**Free text** matches `name` and `description`, case- and accent-insensitively,
as a substring. No index, no library, no fuzzy matching, no relevance ranking —
results sort by date. On a personal ledger the user roughly remembers what they
typed, and the shallow version is a `filter` over an array that is already in
memory.

Text search exists for the case tags cannot serve by construction: finding an
entry that was never tagged. It is why the feature is not tag-only.

Text and tags combine with **AND**. Either side may be empty; no state is
special.

Filters also cover type (income / expense) and date range, and all filter state
lives in the URL — this project keeps navigation state in the route, and it
makes a filtered analysis linkable for free.

**Horizon.** A tag view defaults to realised: nothing past the stored horizon is
derived. Extending into the future is the date filter's job and is always the
user's explicit act; forecast figures are shown separately from realised ones,
never summed into one.

## The analysis view

Route `/tags/$tagId`. Not a destination in itself — reached from the tag list or
from a tag in an entry's info panel.

Four parts, all reusing specified components:

- header — totals (in · out · net), entry count, the span actually covered
- distribution by category — `CategoryDonut`
- change over time — `BarsMonthly`
- the entries — `ListRow`

No new chart. `RankedBars` is dropped here: against a single tag it says what
the donut already says.

The management screen and the search screen are one screen in two states: it
opens listing every tag (sorted by usage) with the text field available, and
narrows to results as filters are applied. Arriving from a tag opens it filtered.

## Navigation

`Categories`, `Cards` and `Tags` sit behind one **Catalogue** destination:

```
Dashboard · Month · Goals · Catalogue
                             └─ Categories · Cards · Tags
```

The tab bar holds five destinations today and five is the documented ceiling in
both major mobile guidelines, so a sixth needed a different shape. Grouping is
the right one rather than a workaround: categories and cards are expected to
gain the same analysis treatment tags get, so all three end up being the same
kind of thing, and the grouping does not have to be reopened when they do.

## Where a tag is visible

**Not on the monthly row.** A tag is read in the entry's info panel, where each
one links to its analysis view. The row keeps its two title-line markers — the
recurring `↻` and the installment `3/12` — and gains nothing.

An earlier draft of this spec put a lucide `Tag` glyph on the row, reasoning
from the `↻` precedent. It was dropped on 2026-08-16.

That draft was also internally inconsistent: it placed the glyph in the `meta`
line while claiming to follow `↻` exactly, and `↻` sits on the *title* line. So
neither placement was ever coherently specified, and both lose on inspection —
in the `meta` line a glyph is orphaned between `date · category` and the author
avatar; on the title line it is a third marker on a line that already truncates
around two.

The placement is the smaller half of it. The precedent argues against the
marker at either spot once read closely: `↻` and `3/12` are markers of what an
entry *is* — its shape does not change, and the marker is the whole fact. A tag
is a *membership*, and one glyph cannot say which tag or how many, so wherever
it sits it buys a question rather than an answer.

The consequence is accepted, not overlooked: **an entry's tags are invisible
until the panel is opened.** Scanning a month for tagged entries is not
possible; that job belongs to the tag's analysis view, which does it better.
Reversible — the marker is one prop on `ListRow` if use shows the gap hurts.

Where a tag *is* rendered — the panel, the analysis view, the input — use `Tag`,
singular. `Tags` is the categories icon.

**Recorded as a consequence, not an oversight:** with no search affordance in
the shell, finding an old untagged entry means going through Catalogue. That was
weighed against putting a search button in `AppHeader` and rejected — the header
carries title, month selector and the screen's one primary action, and a search
icon next to it reads as clutter on a screen about the month. It is reversible:
adding the affordance later is one prop. Revisit if use shows it hurts.

## The entry info panel

The only place an entry's tags are visible, so it carries the feature rather
than decorating it.

**Content**, in order: the entry's name as the title; its description; its date;
its category; `createdAt`; its tags, each one a link to that tag's analysis
view. Authorship joins the list when multi-user lands — the panel is where it
goes, and it is backfillable.

Read-only. It shows an entry, it does not edit one — editing already has its own
trailing action, and a panel that sometimes edits is a second entry form nobody
specified.

**Host:** a centered `Modal` on desktop, `Sheet side="bottom"` below 960px. That
pairing is not a new decision — `Sheet.prompt.md` already documents it for the
"Novo lançamento" flow, and the card-detail overlay is already a `Modal`. No
`Popover` is involved; none exists in the system, and inventing one to host this
would be a third overlay idiom for the same job.

**Opened by** a trailing `info` action on the row, first in the set:
`info` → `square-pen` → `trash-2`. This is the Cartões card head exactly
(`ui-kit/cartoes.card.html`) — the system had already answered "how does a user
open an entity's detail view", and answering it a second way with a row-body tap
would give one product two idioms for one job. The row-body tap also cannot be
made accessible on desktop: the trailing buttons are in the DOM, so a row that
is itself a button nests interactive elements.

On touch the three ride the existing swipe at **44px each** — the system's
touch-target floor, the same one the `TabBar` uses, not the 56px the foundation
used when there were two. Three generous targets eat the line the user needs in
order to know which row they are acting on.

That is 132px revealed by the gesture, and the same 132px is what the Cartões
grid puts on screen permanently under `@media (hover:none)`. The identical
number is what makes the difference exact: revealed on demand, the money axis
stays intact until the user asks; permanent, it is displaced all the time, and
not displacing it is the whole rule. A card has no axis on that edge; a row
does.

## Deliberately out

- **Colour on a tag** — plausible later, and `Tag` is an entity partly so it can
  arrive without a migration. No icon, ever: an icon per free-text tag is work
  at every creation for no recall.
- **Hierarchy / nesting** — two flat tags with `ALL` already give the two depths
  ("every trip" and "this trip"), without a tree to maintain.
- **Authorship** — belongs to the multi-user work, and is backfillable when it
  lands.
- **Fuzzy search, relevance ranking, search by amount** — amount is ambiguous in
  a text field (exact? range? cents?); a range filter is its own control.
- **A command palette (⌘K)** — the best desktop pattern for this, and not in the
  design system. Candidate for later, not for now.

## What the design has to define first

Each is a contract extension rather than a new screen, but none is the
implementer's call.

1. **The tag input.** Filter-as-you-type over existing tags, create-on-miss, and
   the live slug preview. No component covers this.
2. **The Catalogue destination.** A new nav grouping, and both `NavRail` and
   `TabBar` are approved and built.

**Closed 2026-08-16.** Three of the original five.

The trailing-edge action slot on `ListRow` was never a design gap: the approved
Visão Mensal anchor already defines the actions, and
`foundations/layout-row-actions.html` the reveal. Only `ListRowProps` was
behind, and by three things rather than one — the actions, the `↻` marker and
the `3/12` badge. The contract now carries all of them.

The row indicator was closed by dropping it. The info panel and its trigger
were closed together — see "The entry info panel" above — and closing them cost
nothing new: both the host pairing and the `info` affordance already existed in
approved artefacts, they had simply never been pointed at this screen.

## Related

Names in [`../glossary.md`](../glossary.md) · the reasoning in
[`../decisions.md`](../decisions.md).
