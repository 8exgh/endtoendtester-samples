import { PricingService } from './pricing.service';

/* No TestBed at all. A service with constructor dependencies is a plain
   class, and constructing it directly is faster and simpler than asking
   Angular's injector for it.
   https://endtoendtester.com/web-frameworks/angular-testing */
describe('PricingService', () => {
  const service = new PricingService();

  it.each([
    [0, 395],
    [4_999, 395],
    [5_000, 0],
    [12_000, 0]
  ])('charges %i cents shipping on a subtotal of %i', (subtotal, expected) => {
    expect(service.shippingCents(subtotal)).toBe(expected);
  });

  it('ships a gold customer free whatever the subtotal', () => {
    expect(service.shippingCents(1, 'gold')).toBe(0);
  });

  it('adds shipping to the subtotal to make the total', () => {
    expect(service.totalCents(2_400)).toBe(2_795);
  });
});
