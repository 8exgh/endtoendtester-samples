import { applyDiscount, type DiscountPolicy } from './pricing';

/* A unit test: in memory, microseconds, one reason to fail.
   https://endtoendtester.com/testing-levels/unit-testing */

const policy: DiscountPolicy = { thresholdCents: 10_000, percent: 20 };

describe('applyDiscount', () => {
  it('takes 20% off an order over the threshold', () => {
    const order = { subtotalCents: 12_000, tier: 'standard' } as const;

    const result = applyDiscount(order, policy);

    expect(result.discountCents).toBe(2_400);
    expect(result.totalCents).toBe(9_600);
  });

  it('leaves an order under the threshold untouched', () => {
    const result = applyDiscount({ subtotalCents: 9_999, tier: 'standard' }, policy);

    expect(result.discountCents).toBe(0);
    expect(result.totalCents).toBe(9_999);
  });

  /* The boundary is the case most often missing, and the one an
     off-by-one actually breaks. `>=` versus `>` lives or dies here. */
  it('discounts an order of exactly the threshold', () => {
    const result = applyDiscount({ subtotalCents: 10_000, tier: 'standard' }, policy);

    expect(result.discountCents).toBe(2_000);
  });

  it.each([
    [12_000, 2_400],
    [10_000, 2_000],
    [9_999, 0],
    [0, 0]
  ])('discounts a subtotal of %i by %i', (subtotal, expected) => {
    expect(applyDiscount({ subtotalCents: subtotal, tier: 'standard' }, policy).discountCents).toBe(
      expected
    );
  });

  it('never returns a total below zero, whatever the policy says', () => {
    const absurd: DiscountPolicy = { thresholdCents: 0, percent: 100 };

    const result = applyDiscount({ subtotalCents: 5_000, tier: 'standard' }, absurd);

    expect(result.totalCents).toBe(0);
  });
});
