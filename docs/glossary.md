# Glossary

One name per concept, so that two features built a month apart by different
people use the same one.

**The rule:** identifiers, types and message *keys* use the canonical English
term below. A user never sees a key — only the message it resolves to — so an
English key is not a leak in a screen shown in any language.

**No language appears in this table, and that is deliberate.** `en` is the
source locale and the naming authority; every other language is a translation
living in a message catalogue, and adding one is a new catalogue plus a registry
entry. If translations lived here, each new language would be a new column —
and this file would become the thing standing between the app and a language it
does not speak yet. The key tells you where every language's word for a concept
is; this file tells you what the concept is.

## The domain

| Concept | What it is | In code |
| --- | --- | --- |
| income | money arriving in a month | `income`, `Income` |
| expense | money leaving in a month | `expense`, `Expense` |
| savings entry | money set aside — neither spent nor left over | `savingsEntry`, `SavingsEntry` |
| net balance | what a month leaves once the three above are settled | `netBalance` |
| goal | an amount to reach, that savings entries count towards | `goal`, `Goal` |
| installment plan | one purchase split across a run of months | `installmentPlan`, `InstallmentPlan`; a single month's share is an `installment` |
| credit card | a card an installment plan is charged to | `creditCard`, `CreditCard` |
| category | what an expense is filed under | `category`, `Category` |
| monthly view | the screen for reading and entering one month | route `/months/$month`, destination id `months`, key `nav.months` |
| dashboard | the screen for comparing months | route `/dashboard`, destination id `dashboard`, key `nav.dashboard` |
| profile | the entry point to the app's settings | destination id `profile`, route `/settings`, key `nav.profile` |

The month adds up as `income − expenses − savings = net balance`. Savings are
subtracted rather than counted as leftover cash: money set aside is neither
spent nor free, and that distinction is the reason the app exists.

Two names above are deliberately not the canonical term, because the thing they
name is not the concept:

- **`months`, not `monthlyView`** — the destination is the set of months; the
  route names one of them. "Monthly view" is what the screen is called, and
  that is what the message says.
- **`/settings`, not `/profile`** — the route holds the app's settings. Profile
  is where the design puts the entry point to them.

## Money

Money is `Cents` — an integer — everywhere in code: state, domain functions,
storage, props. Never a float, never a formatted string. `12.30` has no exact
binary representation and a column of them drifts by a cent or two; `1230` does
not drift.

Formatting happens once, at the edge, through `useFormatters()` from
`src/i18n`. A component is handed cents and renders text. Nothing between the
two holds a formatted amount.

## Currency

Currency is a setting. It is never derived from the language, and it is never
hardcoded.

Portuguese with euros, English with reais, Japanese with yen — each is a valid
combination and the app has to survive all of them. The design's screens show
`R$` because a mockup has to show something; that is one instance of the
setting, not the setting itself.

## Reading the design artefacts

The design system is authored in Portuguese, so its files label things in
Portuguese. This is a reading aid for those files — not a translation table,
and not a second vocabulary. It stays the same size whatever languages the app
gains.

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
| Visão Mensal | monthly view |
| Painel | dashboard |
| Perfil | profile |

## Related

- Code conventions, including where these names are required:
  [`AGENTS.md`](../AGENTS.md)
- Choices this vocabulary rests on: [`decisions.md`](./decisions.md)
