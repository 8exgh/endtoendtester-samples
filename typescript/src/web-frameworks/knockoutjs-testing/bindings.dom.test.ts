import ko from 'knockout';
import { BasketViewModel, type PricingService } from './basket-view-model';

/* The half that genuinely needs a DOM. Named `.dom.test.ts` so it runs in
   jsdom without pretending to be JSX — the rest of the Knockout sample
   needs no DOM at all, which is the point the article makes.
   https://endtoendtester.com/web-frameworks/knockoutjs-testing */

const noDiscount: PricingService = { discountFor: () => 0 };

describe('bindings, where a DOM is genuinely needed', () => {
  afterEach(() => {
    // Without this the previous test's bindings stay attached and the next
    // applyBindings throws "You cannot apply bindings multiple times".
    ko.cleanNode(document.body);
    document.body.innerHTML = '';
  });

  it('renders one row per line', () => {
    document.body.innerHTML = `
      <table><tbody data-bind="foreach: lines">
        <tr><td data-bind="text: sku"></td></tr>
      </tbody></table>`;
    const vm = new BasketViewModel(noDiscount);
    vm.addLine('book-1', 1_200, 1);
    vm.addLine('pen-2', 500, 1);

    ko.applyBindings(vm, document.body);

    expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(document.body.textContent).toContain('book-1');
  });

  it('updates the rendered total when an observable changes', () => {
    document.body.innerHTML = '<span data-bind="text: formattedTotal"></span>';
    const vm = new BasketViewModel(noDiscount);
    vm.addLine('book-1', 1_200, 1);

    ko.applyBindings(vm, document.body);
    expect(document.querySelector('span')!.textContent).toBe('£12.00');

    vm.lines()[0].quantity(2);

    expect(document.querySelector('span')!.textContent).toBe('£24.00');
  });
});

describe('a custom binding handler', () => {
  beforeAll(() => {
    ko.bindingHandlers.money = {
      update(element: HTMLElement, valueAccessor: () => unknown) {
        const cents = Number(ko.unwrap(valueAccessor()));
        element.textContent = `£${(cents / 100).toFixed(2)}`;
      }
    };
  });

  afterEach(() => {
    ko.cleanNode(document.body);
    document.body.innerHTML = '';
  });

  it('formats minor units as pounds, and keeps doing so on change', () => {
    document.body.innerHTML = '<span data-bind="money: totalCents"></span>';
    const totalCents = ko.observable(2_795);

    ko.applyBindings({ totalCents }, document.body);
    expect(document.querySelector('span')!.textContent).toBe('£27.95');

    totalCents(100);

    expect(document.querySelector('span')!.textContent).toBe('£1.00');
  });
});
