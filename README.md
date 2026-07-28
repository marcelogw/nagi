# nagi 凪

> The calm after the wind stops.

Nagi is an open-source personal and household finance app. Track income,
expenses, savings, and goals with a calm, uncluttered month-by-month view —
no daily transaction logging, no anxiety-inducing spreadsheets.

## Model

`Income − Expenses − Savings = Left over`. Saving/investing isn't spending
and isn't leftover cash — it's its own bucket, tracked against goals.

## Open-core

- **Self-hosted (free):** the full app, no feature gated behind a paywall.
  Bring your own server for multi-device sync and household sharing.
- **Nagi Cloud (paid):** the same app, hosted for you — sync, backup, and
  sharing that work out of the box. The only closed-source part of this
  project is billing.

## Stack

Vite · React 19 · TypeScript · TanStack Router · Tailwind · shadcn/ui ·
Zustand. See [`AGENTS.md`](./AGENTS.md) for the full set of technical
decisions and conventions.

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run typecheck  # tsc --build
npm run lint       # oxlint
npm run format     # prettier --write
npm run test       # vitest
npm run build      # production build
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and our
[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## License

[AGPL-3.0](./LICENSE)
