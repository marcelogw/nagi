## What

<!-- One line: what this PR changes, and why. -->

## How it was verified

<!--
The paths you actually exercised, and what you checked by hand. Not "it works" —
what you drove, and what you looked at. If it touches UI, say which screens and
which states (empty, dense, error).
-->

## Checks

Leave a box **unchecked** and append `— N/A: <reason>` when it genuinely does not
apply (a docs-only change has no screenshot). Never tick a box you did not do,
and never delete a line to make it go away.

- [ ] `npm run quality`
- [ ] `npm run test`
- [ ] `npm run test:e2e`
- [ ] Screenshot reviewed against an existing screen
- [ ] Light and dark, and both breakpoints
- [ ] Matches the design system — nothing invented
- [ ] No hardcoded user-visible strings; keys added to every message file
- [ ] Reviewed by a second instance

These are the evidence a reviewer reads. They are not the whole bar — the full
definition of done is in [`CONTRIBUTING.md`](../CONTRIBUTING.md#definition-of-done),
and it also covers where logic lives and which tests have to exist.

## Notes for reviewers

<!-- Anything non-obvious: trade-offs taken, follow-up deliberately left out. -->
