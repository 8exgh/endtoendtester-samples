# Mutation Testing — TypeScript

The runnable sample for **[Mutation Testing](https://endtoendtester.com/coverage/mutation-testing)**.

[![typescript.yml](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml/badge.svg?branch=main)](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain)

Runs on every push. The badge above is live; click it for the last result.

## Running it

```bash
cd typescript && npm ci && npm test
```

## Notes

This sample has no test file of its own. It is the Stryker run configured
in `../../../stryker.config.json`, which mutates exactly two modules:

| Module | Tests | Expected mutation score |
|---|---|---|
| `coverage/code-coverage/money.ts` | exhaustive | high |
| `coverage/coverage-metrics/shipping.ts` | two, deliberately incomplete | low |

`npm run mutation` runs it, and `../../../tools/assert-mutation-scores.mjs`
fails if the two modules ever stop telling that story — which makes it a
test of the demonstration rather than a number nobody reads.

The point: `shipping.ts` sits at **100% line coverage** and still has
surviving mutants, because coverage records that a line executed and
mutation testing records whether anybody was watching.

https://endtoendtester.com/coverage/mutation-testing

---

Part of [endtoendtester.com](https://endtoendtester.com) — a connected reference for test automation.
Every article's samples are listed at [https://endtoendtester.com/samples](https://endtoendtester.com/samples).
