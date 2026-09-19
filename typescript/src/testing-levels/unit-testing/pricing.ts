/* The unit under test: a pure function of its inputs. No clock, no I/O, no
   configuration read at the point of use — which is what makes the test
   below three lines long. */

export interface Order {
  subtotalCents: number;
  tier: 'standard' | 'gold';
}

export interface DiscountPolicy {
  thresholdCents: number;
  percent: number;
}

export interface Priced {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export function applyDiscount(order: Order, policy: DiscountPolicy): Priced {
  const qualifies = order.subtotalCents >= policy.thresholdCents;
  const discountCents = qualifies ? Math.round((order.subtotalCents * policy.percent) / 100) : 0;

  return {
    subtotalCents: order.subtotalCents,
    discountCents,
    totalCents: order.subtotalCents - discountCents
  };
}
