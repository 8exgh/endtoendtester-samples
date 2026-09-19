/* The worked example from the article, as code you can point a coverage
   tool at. https://endtoendtester.com/coverage/coverage-metrics

   Two tests reach 100% line coverage of this file and leave two decisions
   only ever taken one way. `npm run coverage:metrics` proves it. */

export interface Order {
  subtotalCents: number;
  isExpress: boolean;
}

export interface Customer {
  tier: 'standard' | 'gold';
}

export function shippingCents(order: Order, customer: Customer): number {
  if (customer.tier === 'gold' || order.subtotalCents >= 5_000) {
    return 0;
  }
  return order.isExpress ? 995 : 395;
}
