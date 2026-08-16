# Glossary

One name per concept, so a single thing does not end up with three.

Identifiers, types and message keys use the canonical term below. No language
appears here: translations live in the message catalogues, so adding a locale is
a new catalogue plus a registry entry and changes nothing in this file.

## The domain

| Concept | In code |
| --- | --- |
| income | `income`, `Income` |
| expense | `expense`, `Expense` |
| savings entry | `savingsEntry`, `SavingsEntry` — set aside, not spent |
| net balance | `netBalance` — what the month leaves |
| goal | `goal`, `Goal` |
| installment plan | `installmentPlan`, `InstallmentPlan`; one month's share is an `installment` |
| credit card | `creditCard`, `CreditCard` |
| category | `category`, `Category` — the *kind* of an operation, single-valued, mandatory |
| tag | `tag`, `Tag` — the *context* of an operation, multi-valued, optional, user-created |
| catalogue | `catalogue` — the nav grouping over category, credit card and tag. A grouping, not a destination: no route, and the active destination is always one of its three leaves |
| horizon | `horizon` — the last month the app derives and navigates to |
| name | `name` — what an entry is. Required on every entry |
| description | `description` — optional detail on an entry, read in its info panel and by search |
| monthly view | route `/months/$month`, destination id `months` |
| dashboard | route `/dashboard`, destination id `dashboard` |
| profile | destination id `profile`, route `/settings` |

`income − expenses − savings = net balance`. Savings are subtracted rather than
counted as leftover cash: money set aside is neither spent nor free, and that
distinction is the reason the app exists.

The last two rows disagree with their concept on purpose — the destination is
the set of months and the route names one of them; the route holds settings, and
profile is where the design puts the way in.

## Money

`Cents`, an integer, everywhere: state, `src/domain/`, storage, props. Never a
float and never a formatted string. Formatting happens once at the edge, through
`useFormatters()` from `src/i18n`.

## Currency

A setting. Never derived from the language, never hardcoded — the design's `R$`
is one instance of the setting, not the setting.

## Reading the design artefacts

They are written in Portuguese. This maps their labels to the concepts above; it
is not a translation table and does not grow when the app gains a language.

| In the design | Concept |
| --- | --- |
| Entrou | income |
| Saiu | expense |
| Guardou | savings entry |
| Sobrou | net balance |
| Meta | goal |
| Parcelamento | installment plan |
| Cartão | credit card |
| Categoria | category |
| Catálogo | catalogue |
| Visão Mensal | monthly view |
| Painel | dashboard |
| Perfil | profile |

## Related

Conventions in [`AGENTS.md`](../AGENTS.md) · the reasoning behind these choices
in [`decisions.md`](./decisions.md).
