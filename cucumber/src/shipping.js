/* The behaviour the scenarios describe. Plain ESM JavaScript, because this
   sample is about Gherkin rather than about a compiler.
   https://endtoendtester.com/practices/given-when-then */

export const STANDARD_SHIPPING_CENTS = 395;

export class Customer {
  constructor(name, { subscriptionExpiresAt = null } = {}) {
    this.name = name;
    this.subscriptionExpiresAt = subscriptionExpiresAt;
  }

  hasActiveSubscriptionAt(instant) {
    return this.subscriptionExpiresAt !== null && this.subscriptionExpiresAt > instant;
  }
}

/* The rule the three amigos actually argued about: subscription status is
   taken at checkout, not when the basket was filled. */
export function shippingCentsAt(customer, instant) {
  return customer.hasActiveSubscriptionAt(instant) ? 0 : STANDARD_SHIPPING_CENTS;
}
