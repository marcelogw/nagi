---
name: nagi-design
description: Nagi's design system as a rule set — the do-not-invent boundary, semantic tokens, the closed coral list, colour meanings, icon, layout, motion and accessibility rules, plus an index of which screens the design actually defines. Read it before writing, restyling or reviewing any UI in this repo.
---

# Nagi design system

Everything the user sees comes from here. This file holds the rules; the values
they name live in `src/styles/tokens/`, and the two worked examples are in
[`reference/canonical-examples.md`](./reference/canonical-examples.md).

## 1. If it is not defined, it does not get built

Before writing a screen, a layout, a component variant or a flow, check §2 for
whether the design defines it.

- **Defined** — follow it faithfully. The test for a refactor is "pixel-equal or
  better".
- **Not defined** — stop. Do not approximate, do not fill the gap "for now", do
  not ship a placeholder that looks final. Record what exactly is missing (the
  screen, the state, the variant, the copy), say so on the issue or PR, finish
  everything in the change that is *not* blocked, and leave the rest.

Blocking is the cheap outcome. An invented screen is a decision made silently,
and it survives into the product as if someone had chosen it deliberately.
Scaling the work down is the maintainer's call, not yours.

This holds for behaviour too: an edge case the spec does not cover is a
question, not a judgement call.

## 2. What the design defines

The point of this index is to let you tell *undefined* from *I did not look*.

**Screens designed and approved.** Monthly view — the anchor, and the proof of
the whole system; dashboard; categories (list, create, edit, delete with
confirmation); credit cards (grid, create, edit, delete, and a card-detail
overlay with per-card history); goals (list, progress with a forecast band,
create, edit, contribution, reached state); the <960px layout, where the nav
rail becomes a tab bar and columns stack; the data-status states — local,
synced, syncing, offline-queued, conflict; the brand assets.

**Components specified.** Button and IconButton · Input, Select, DatePicker,
CategorySelect, TagInput · Card, Badge, ProgressBar, MoneyText, ListRow, Avatar
and AvatarGroup · the four charts (monthly bars, category donut, balance
sparkline, ranked bars) · Modal, Sheet, ConfirmDialog, Toast with undo ·
AppShell, NavRail, TabBar, AppHeader, NagiMark · EmptyState, Skeleton.

**Navigation is a tree, not a list.** A `NavItem` may carry `children`, which
makes it a grouping and not a destination — no route, and `active` is always a
leaf. `NavRail` draws a group as a second overline section and shows its
children inline; `TabBar` renders it as one tab opening a bottom `Sheet` with
the same nav items. Catalogue (Categories · Cards · Tags) is the one group
today. There is no hub screen and none is designed: a screen listing
sub-destinations would be an invented screen.

**Not designed — stop and ask.** Landing, login, onboarding, the profile and
settings screen, and any reports or trends view beyond the dashboard. A
component variant not listed above is also undefined, however reasonable it
sounds.

Only the shell is built so far — `src/components/shell/` is the one place in
this repo where a specified component has become code. Everything else on the
list is a spec waiting for its feature.

## 3. Tokens

Product code reads **semantic** tokens only — the roles in
`src/styles/tokens/semantic.css`. The primitives in `palette.css` are the layer
underneath and are never referenced outside it. That indirection is the whole
rebrand contract: re-point the semantic layer, touch zero product code. A
hardcoded colour is rejected by the linter for the same reason.

| Role | Tokens |
| --- | --- |
| Surfaces | `--background` `--surface` `--surface-muted` `--surface-subtle` |
| Text | `--foreground` `--foreground-muted` `--foreground-subtle` |
| Lines & focus | `--border` `--border-strong` `--input` `--ring` |
| Brand | `--primary` `--primary-hover` `--primary-foreground` `--primary-text` `--primary-tint` |
| Positive | `--success` `--success-text` `--success-foreground` `--success-tint` |
| Attention | `--warning` `--warning-foreground` |
| Destructive | `--danger` `--danger-foreground` `--danger-text` `--danger-tint` |
| Accent | `--accent-coral` `--accent-coral-foreground` `--accent-coral-text` `--accent-coral-tint` |
| Brand motif | `--waterline` `--waterline-mask` `--wl-h` `--wl-gap` |
| Money | `--income` `--expense` `--expense-strong` |

Scales, same rule — a step or nothing: `--space-*` (4px grid), `--radius-*`,
`--text-*`, `--weight-*`, `--leading-*`, `--tracking-*`, `--shadow-*`,
`--icon-*`, `--duration-*`, `--ease-*`.

**How you consume them: Tailwind utilities, always.** Every component in `src/`
is styled in its `className` — no `.css` file per component, in any form. The
tokens above are exposed as utilities (`bg-surface-muted`, `text-foreground-muted`,
`gap-3`, `rounded-lg`, `duration-fast`), and Tailwind's own default palette is
cleared, so `bg-gray-100` generates nothing and breaks visibly rather than
shipping an off-system grey. Type is named by **role** — `text-body`,
`text-title`, `text-display` — never by size. An arbitrary value (`w-[13px]`,
`tracking-[-0.01em]`) is rejected by the linter: if a step is genuinely missing
it gets added here, in the same change. The mockups in the design repo are
written in plain CSS; that is how they were drawn, not how the product is
built — translate them, do not copy the stylesheet. Settled in
`docs/decisions.md`; not reopenable from a mockup.

Dark mode is the same system under `.dark`. Only colour tokens change — type,
icon sizes, spacing and radii are identical in both themes, so a layout that
needs adjusting for dark is a layout bug.

## 4. Colour carries meaning

Getting these backwards is the fastest way to make the app read as a different
product.

- **The tint rule.** Inside a `-tint` chip, the content — text **and
  icon** — uses that family's `-text` token: `--primary-text`, `--success-text`,
  `--accent-coral-text`, `--danger-text`. The base colour stays for fills, borders and the focus
  ring. Splitting the two ("icon uses the base colour") shipped the same defect
  twice: `--success` is 1.99:1 on its own tint and `--accent-coral` is 2.64:1 —
  under even the 3:1 graphical-object floor of WCAG 1.4.11. Two colours per
  background need two measurements per family; one rule cannot half-fail.
- **Income is teal.** As *text* — an amount, a label — teal is `--success-text`.
  `--success` is for fills, chart series and large bold type.
- **Brand blue follows the same split.** On anything tinted — `--primary-tint`,
  `--surface-muted`, `--surface-subtle` — blue is `--primary-text`.
  `--primary` only clears AA on `--surface`; on the tint it is 4.17:1 and on the
  page `--background` 4.41:1. `--primary` stays for fills, borders and the ring.
- **The water-line** is the brand motif, and it is a MASK, not an image: the
  colour comes from `background`, so dark mode is free. Use the `.nagi-waterline`
  class, or `mask: var(--waterline-mask)` in a pseudo-element where no class can
  hang — never retype the three mask layers. `--wl-h` governs amplitude, not just
  size: above ~12px the wave goes spiky and reads as an ECG, the wrong metaphor
  for a money app. The side gap derives from it. Always `aria-hidden`.
- **Expense is slate, never red.** `--expense` / `--expense-strong`. Red on a
  routine grocery bill turns ordinary spending into an error.
- **Red is `--danger`, and only for error, overspend and delete.**
- **Amber is `--warning`: calm attention, never alarm.** Offline is a normal
  state, not a failure.
- **Blue `--primary` is action, focus and saving.**
- `--foreground-subtle` is placeholder and disabled text only. Meta text a user
  is meant to read goes in `--foreground-muted`.
- Roughly 60% neutral surface, 30% primary, 10% accent. No broad colour fills.

## 5. Brand

**Wordmark:** `nagi.` lowercase, Nunito 800 (`--font-heading`,
`--weight-extrabold`), `--tracking-tight`, with the final dot in
`--accent-coral`. There is no other logotype, tagline or mascot.

**Symbol:** a single stroke — a wave losing force until the water lies flat.
Three oscillations decaying 13 : 8 : 5 (Fibonacci) over gaps that shrink by φ.
It reads as *settle*, and flat water is water you can read through, which is the
financial idea. The only hand-drawn shape in the entire system; everything else
is Lucide line geometry.

`NagiMark` in `src/components/shell/` is the only copy in product code, and
`public/favicon.svg` restates the same path for the browser tab because a favicon
cannot resolve `var()`. **Do not redraw it, do not inline it a third time, and do
not adjust the control points** — they were solved numerically and the comment in
the component says what breaks. The symbol is **monochrome** (`currentColor`), so
it needs no colour or dark-mode variant, and **no coral goes inside it** — coral
appears exactly once, on the wordmark dot.

**Voice:** calm, second person, no jargon, one-word labels, and let the numbers
speak. No gamification, no urgency, no inflating adjectives.

### The coral list is closed

Coral is the brand's signature and its memorability comes from repetition, so it
must appear — but at most **one dominant coral accent per screen**, never
competing with the primary action. These five uses, and nothing else:

1. the wordmark dot
2. a goal-reached seal — achievement, calm, never alarm
3. a novelty dot, ~8px with a surface ring, for new or unread
4. a "now" / today marker
5. a pointed accent on the 24px empty-state icon

**Coral is never** a dominant background, a primary button, an error, an
expense, a delete or danger colour, or decoration. Two neutrals that look like
candidates and are not: the recurring `↻` marker is `--foreground-subtle`
(it repeats on many rows, so it can never be the single accent) and the
installment badge `3/12` is neutral slate.

Delete is red. That is a recorded decision — see `docs/decisions.md`.

## 6. Icons

Lucide, line style, and nothing else — no emoji, no second icon set, no
illustrative SVG anywhere in the interface.

- Colour defaults to `currentColor`. Use a token only when the colour carries
  meaning: `--success` for income, `--danger` for an error, the category tint on
  a tile. Never colour an icon for decoration.
- Size comes from `--icon-xs`…`--icon-xl` (14–24px), never an arbitrary value —
  16px in buttons, 18px in list rows, 24px in empty states. The 2px stroke and
  the icon's proportions do not change. Category tiles are `--icon-tile` (36px).
- Pair an icon with text unless the glyph is universally unambiguous (close,
  search, add, menu, nav chevrons). An icon-only control carries an `aria-label`.

## 7. Layout

- **Calm and restrained.** Hierarchy comes from weight, family and white space —
  not from inflating size. An amount in a row or field is `--text-lg` at most;
  the only large number on a screen is its hero balance (`--text-2xl`).
  A modal or card title is `--text-lg`, a confirm-dialog title `--text-base`.
  Weight 800 appears nowhere but the hero balance. If something feels loud,
  shrink it before adding anything.
- **4px grid.** Every padding, gap, size and radius is a `--space-*` /
  `--radius-*` token. Lay out with flex or grid and `gap` — never margins on
  siblings, never whitespace text nodes.
- **Shared axes.** Text starts on one left axis; amounts end on one right axis.
  Money is right-aligned with tabular numerals
  (`font-feature-settings: var(--numeric-features)`) so magnitudes compare at a
  glance. Cents are set smaller than the integer part.
- **Proximity over dividers.** Keep a title and its meta tight; separate groups
  with space, not rules.
- **White space is active.** Prefer removing to adding. Do not fill empty areas.
- **Every interactive element has hover and focus** — a calm
  `--duration-fast` / `--ease-settle` transition, never a jump. Primary button
  to `--primary-hover`; secondary to `--surface-subtle`; ghost and icon buttons
  to a `--surface-muted` fill; fields and triggers to a `--border-strong` border,
  with a visible `--ring` on focus; text actions to a light `--primary-tint`.
- **Row actions reveal on the trailing edge** and never push content or shift the
  money axis — the row is identical with and without them. Hover on desktop,
  swipe on mobile, an overflow menu as the universal fallback. The set is closed
  and ordered: **Info → Edit → Delete**, the Cartões card head exactly, which is
  where the system answered "how does a user open an entity's detail view".
  There is no Duplicate. Touch targets are ≥40px, ≥44px on mobile, and the three
  ride the swipe at 44px each.
- **Delete always confirms** — a dialog or an undo. Never destructive on first
  tap.
- Text sized by content, never fixed widths: translations run 15–30% longer than
  the English source, and a fixed width is how a button clips in the second
  locale.

## 8. Motion

Motion clarifies; it never entertains. Everything comes from `--duration-*` and
`--ease-*` — short, eased, no bounce or overshoot — and everything honours
`prefers-reduced-motion` by dropping to ~0 and keeping opacity only.

There is exactly **one** easing token: `--ease-settle`, the authored curve of the
tide coming to rest. Every row below uses it. There is no `--ease-out` or
`--ease-standard` to reach for — if a transition seems to want one, it wants a
different duration instead.

| What | How |
| --- | --- |
| Hover, press | `--duration-fast`, `--ease-settle` |
| Collapse, expand | `--duration-base`, animating `grid-template-rows` 1fr↔0fr on a wrapper with `overflow: hidden; min-height: 0` — never a bare `display: none`. Chevron rotates 0°↔−90° |
| Modal | backdrop fade, dialog rises ~8px and scales 0.98→1, `--duration-slow` `--ease-settle`; exit at `--duration-base` |
| Sheet | slides from its anchored edge, `--duration-slow` `--ease-settle` |
| Toast, undo | rise and fade in at `--duration-base` `--ease-settle`; auto-dismiss fades and shrinks slightly |
| Progress, charts | draw in over `--duration-slower` — the only long duration, and only for data that grows |
| Screen change | the shell does not move. Only the content region cross-fades and rises ~8px: **the house stays, the month changes** |
| Theme switch | background transitions over `--duration-slow` |

## 9. Accessibility

Non-negotiable in an app about money.

- **Never communicate with hue alone.** Charts always carry label, value and a
  fixed series order — the donut also has a track and 2px gaps between slices.
  Status states pair colour with an icon and text.
- Inside a `-tint` chip, text and icon both use that family's `-text` token.
  `--accent-coral` itself is only large, bold or graphical (3:1) — never body
  text. `--foreground-subtle` is quiet but readable (4.76:1, AA); placeholder and
  disabled live in `--foreground-disabled`.
- Visible `--ring` focus on everything interactive; icon-only controls carry an
  `aria-label`; dialogs trap focus and restore it on close.
- Both themes and both breakpoints are part of "done", not a later pass.

## 10. Before you write the component

Read [`reference/canonical-examples.md`](./reference/canonical-examples.md) —
one form, one dialog — and copy the nearer one rather than inventing a shape.
They exist so "read two existing components first" is something you can actually
do on a repo this young.

Names come from `docs/glossary.md`; the conventions the linter cannot check are
in `AGENTS.md`; what counts as done is in `CONTRIBUTING.md`. None of it is
repeated here.
