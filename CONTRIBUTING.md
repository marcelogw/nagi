# Contributing to Nagi

Thanks for taking a look. Nagi is early — parts of this guide will get more
specific as the app itself gets scaffolded. The rules below already apply.

## Language

- Code, comments, identifiers, commit messages, and technical documentation:
  **English only**.
- Product UI strings ship in English and Portuguese (pt-BR), added together
  through the app's message files — never hardcoded in a component.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), in English,
with a body explaining *why*:

```
<type>(<scope>): <imperative description>

<why this change was made, what it does>
```

Allowed types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`.
No generic messages ("update file", "fix bug").

## Pull requests

- **Every change lands via PR** — no direct pushes to `master` beyond
  trivial repo hygiene (typo fixes, config with no behavior change).
- `master` is protected: PRs must pass CI before merge.
- A PR should be one complete, reviewable unit of work. Half-done features
  (missing tests, missing translations, TODO-flagged edge cases) don't merge
  as "done" — see `AGENTS.md` for the project's definition of done once it's
  written up.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).
