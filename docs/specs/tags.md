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

On the monthly row, a tag is indicated and not listed: a lucide `Tag` glyph in
the `meta` line, `--foreground-subtle`. This follows the recurring `↻` marker
exactly — the design system already reasons that a marker repeating across many
rows can never be the screen's single accent. Never coral; the coral list is
closed and does not include this.

Use `Tag`, singular — `Tags` is the categories icon.

The indicator is deliberately minimal rather than a set of chips. `ListRow` is
approved design and its `meta` line is already *date · category*; chips would
rewrite the anchor screen's row. The full tag set is read in the entry's info
panel, where each tag links to its analysis view.

**Recorded as a consequence, not an oversight:** with no search affordance in
the shell, finding an old untagged entry means going through Catalogue. That was
weighed against putting a search button in `AppHeader` and rejected — the header
carries title, month selector and the screen's one primary action, and a search
icon next to it reads as clutter on a screen about the month. It is reversible:
adding the affordance later is one prop. Revisit if use shows it hurts.

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

None of these exists in the design system. Each is a contract extension rather
than a new screen, but none is the implementer's call.

1. **A trailing-edge action slot on `ListRow`.** The rule exists — actions
   reveal on the trailing edge and never displace the money axis — but
   `ListRowProps` has no slot for them.
2. **The info panel.** Shows description, `createdAt`, the entry's date, its
   tags, and later its author. `Sheet` is specified and is the likely host; no
   `Popover` exists in the system.
3. **The tag input.** Filter-as-you-type over existing tags, create-on-miss, and
   the live slug preview. No component covers this.
4. **The row indicator.** The `↻` treatment is the precedent; the exact glyph and
   placement are the design's call.
5. **The Catalogue destination.** A new nav grouping, and both `NavRail` and
   `TabBar` are approved and built.

## Related

Names in [`../glossary.md`](../glossary.md) · the reasoning in
[`../decisions.md`](../decisions.md).
