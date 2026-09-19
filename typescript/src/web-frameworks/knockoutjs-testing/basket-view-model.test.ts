import ko from 'knockout';
import { BasketViewModel, type PricingService } from './basket-view-model';

/* https://endtoendtester.com/web-frameworks/knockoutjs-testing */

const noDiscount: PricingService = { discountFor: () => 0 };

describe('the view model, with no DOM at all', () => {
  it('totals every line at its own quantity', () => {
    const vm = new BasketViewModel(noDiscount);

    vm.addLine('book-1', 1_200, 2);
    vm.addLine('pen-2', 500, 1);

    expect(vm.subtotalCents()).toBe(2_900);
  });

  it('recomputes when a line quantity is written to', () => {
    const vm = new BasketViewModel(noDiscount);
    vm.addLine('book-1', 1_200, 1);

    vm.lines()[0].quantity(3);

    expect(vm.subtotalCents()).toBe(3_600);
  });

  it('applies whatever the injected pricing service returns', () => {
    const tenPercentOnSummer: PricingService = {
      discountFor: (subtotal, code) => (code === 'SUMMER' ? Math.round(subtotal * 0.1) : 0)
    };
    const vm = new BasketViewModel(tenPercentOnSummer);
    vm.addLine('book-1', 1_000, 2);

    vm.discountCode('SUMMER');

    expect(vm.discountCents()).toBe(200);
    expect(vm.formattedTotal()).toBe('£18.00');
  });

  it('notifies a subscriber once per change, in order', () => {
    const vm = new BasketViewModel(noDiscount);
    const seen: number[] = [];
    const subscription = vm.totalCents.subscribe((value) => seen.push(value));

    vm.addLine('book-1', 1_200, 1);
    vm.addLine('pen-2', 500, 1);

    expect(seen).toEqual([1_200, 1_700]);
    // Undisposed subscriptions are how a Knockout suite acquires
    // cross-test interference.
    subscription.dispose();
  });
});
