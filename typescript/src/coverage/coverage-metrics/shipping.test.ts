import { shippingCents } from './shipping';

/* Deliberately incomplete. Every line of shipping.ts executes, so line
   coverage reports 100% — and the express branch and the £50 threshold are
   both untested, because `||` short-circuits on the first test.

   `npm run coverage:metrics` asserts that gap exists, which is the whole
   point of the article: line coverage is the weakest useful metric.
   https://endtoendtester.com/coverage/coverage-metrics */

describe('shippingCents (deliberately under-tested)', () => {
  it('is free for a gold customer', () => {
    expect(shippingCents({ subtotalCents: 1_000, isExpress: false }, { tier: 'gold' })).toBe(0);
  });

  it('is 395 for a standard customer below the threshold', () => {
    expect(shippingCents({ subtotalCents: 1_000, isExpress: false }, { tier: 'standard' })).toBe(395);
  });

  /* The tests that would close the gap, and are deliberately absent:
   *
   *   it('is free at exactly the threshold', ...)        // `>=` vs `>`
   *   it('charges 995 for express delivery', ...)        // the ternary
   *
   * Uncomment them and `npm run coverage:metrics` fails, because the gap
   * it asserts on is gone. That is the test for the demonstration.
   */
});
