import ko from 'knockout';

/* A Knockout view model is a plain constructor function and an observable
   is a plain function, so most of a Knockout application can be tested with
   no DOM at all. The one design change that makes it easy is injecting the
   service rather than calling $.ajax inside.
   https://endtoendtester.com/web-frameworks/knockoutjs-testing */

export interface PricingService {
  discountFor(subtotalCents: number, code: string): number;
}

export interface Line {
  sku: string;
  unitCents: number;
  quantity: ko.Observable<number>;
}

export class BasketViewModel {
  readonly lines = ko.observableArray<Line>([]);
  readonly discountCode = ko.observable('');
  readonly subtotalCents: ko.PureComputed<number>;
  readonly discountCents: ko.PureComputed<number>;
  readonly totalCents: ko.PureComputed<number>;
  readonly formattedTotal: ko.PureComputed<string>;

  constructor(private readonly pricing: PricingService) {
    this.subtotalCents = ko.pureComputed(() =>
      this.lines().reduce((sum, line) => sum + line.unitCents * line.quantity(), 0)
    );
    this.discountCents = ko.pureComputed(() =>
      this.pricing.discountFor(this.subtotalCents(), this.discountCode())
    );
    this.totalCents = ko.pureComputed(() => this.subtotalCents() - this.discountCents());
    this.formattedTotal = ko.pureComputed(() => `£${(this.totalCents() / 100).toFixed(2)}`);
  }

  addLine(sku: string, unitCents: number, quantity: number) {
    this.lines.push({ sku, unitCents, quantity: ko.observable(quantity) });
  }
}
