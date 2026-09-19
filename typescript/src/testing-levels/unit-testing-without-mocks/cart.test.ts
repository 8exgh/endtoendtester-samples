import { Cart, DiscountPolicy } from './cart';

/* https://endtoendtester.com/testing-levels/unit-testing-without-mocks
   Four real classes take part. The tests name none of the collaborations,
   so inlining DiscountPolicy into Cart tomorrow breaks nothing here. */

describe('Cart', () => {
  it('sums its lines', () => {
    const cart = new Cart([
      { sku: 'book', unitCents: 2_000, quantity: 3 },
      { sku: 'pen', unitCents: 500, quantity: 1 }
    ]);

    expect(cart.subtotalCents).toBe(6_500);
  });

  it('applies the best single discount, never two', () => {
    const cart = new Cart([
      { sku: 'book', unitCents: 2_000, quantity: 3 },
      { sku: 'pen', unitCents: 500, quantity: 1 }
    ]);
    const policies = [
      DiscountPolicy.percentOver('SUMMER', 10, { thresholdCents: 5_000 }),
      DiscountPolicy.fixed('WELCOME', 1_500)
    ];

    const total = cart.totalWith(policies);

    expect(total.discountCents).toBe(1_500);
    expect(total.appliedCode).toBe('WELCOME');
    expect(total.payableCents).toBe(5_000);
  });

  it('prefers the percentage once the basket is big enough for it to win', () => {
    const cart = new Cart([{ sku: 'desk', unitCents: 40_000, quantity: 1 }]);

    const total = cart.totalWith([
      DiscountPolicy.percentOver('SUMMER', 10, { thresholdCents: 5_000 }),
      DiscountPolicy.fixed('WELCOME', 1_500)
    ]);

    expect(total).toEqual({
      subtotalCents: 40_000,
      discountCents: 4_000,
      payableCents: 36_000,
      appliedCode: 'SUMMER'
    });
  });

  it('applies nothing to an empty cart', () => {
    const total = new Cart([]).totalWith([DiscountPolicy.fixed('WELCOME', 1_500)]);

    expect(total).toEqual({
      subtotalCents: 0,
      discountCents: 0,
      payableCents: 0,
      appliedCode: null
    });
  });

  it('never discounts below zero', () => {
    const cart = new Cart([{ sku: 'pen', unitCents: 500, quantity: 1 }]);

    const total = cart.totalWith([DiscountPolicy.fixed('GENEROUS', 10_000)]);

    expect(total.payableCents).toBe(0);
    expect(total.discountCents).toBe(500);
  });
});
