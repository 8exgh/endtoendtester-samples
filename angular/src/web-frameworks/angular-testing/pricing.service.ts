import { Injectable } from '@angular/core';

/* A service with no Angular in it but the decorator. It can be tested as a
   plain class — no TestBed, no fixture, microseconds — which is the first
   thing the article says to do.
   https://endtoendtester.com/web-frameworks/angular-testing */
@Injectable({ providedIn: 'root' })
export class PricingService {
  static readonly FREE_SHIPPING_THRESHOLD_CENTS = 5_000;
  static readonly STANDARD_SHIPPING_CENTS = 395;

  shippingCents(subtotalCents: number, tier: 'standard' | 'gold' = 'standard'): number {
    if (tier === 'gold' || subtotalCents >= PricingService.FREE_SHIPPING_THRESHOLD_CENTS) return 0;
    return PricingService.STANDARD_SHIPPING_CENTS;
  }

  totalCents(subtotalCents: number, tier: 'standard' | 'gold' = 'standard'): number {
    return subtotalCents + this.shippingCents(subtotalCents, tier);
  }
}
