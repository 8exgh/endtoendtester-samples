# Mutation testing

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
