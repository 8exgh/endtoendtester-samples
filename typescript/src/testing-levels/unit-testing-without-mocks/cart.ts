/* The sociable setup: real collaborators, assertions on the outcome.
   https://endtoendtester.com/testing-levels/unit-testing-without-mocks */

export interface LineItem {
  sku: string;
  unitCents: number;
  quantity: number;
}

export class DiscountPolicy {
  private constructor(
    readonly code: string,
    private readonly kind: 'percent' | 'fixed',
    private readonly value: number,
    private readonly thresholdCents: number
  ) {}

  static percentOver(code: string, percent: number, opts: { thresholdCents: number }) {
    return new DiscountPolicy(code, 'percent', percent, opts.thresholdCents);
  }

  static fixed(code: string, cents: number) {
    return new DiscountPolicy(code, 'fixed', cents, 0);
  }

  discountFor(subtotalCents: number): number {
    if (subtotalCents < this.thresholdCents) return 0;
    const raw = this.kind === 'percent' ? Math.round((subtotalCents * this.value) / 100) : this.value;
    return Math.min(raw, subtotalCents);
  }
}

export interface CartTotal {
  subtotalCents: number;
  discountCents: number;
  payableCents: number;
  appliedCode: string | null;
}

export class Cart {
  constructor(private readonly lines: LineItem[]) {}

  get subtotalCents(): number {
    return this.lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
  }

  /** The best single discount, never two. */
  totalWith(policies: DiscountPolicy[]): CartTotal {
    const subtotal = this.subtotalCents;
    let best: { code: string; cents: number } | null = null;

    for (const policy of policies) {
      const cents = policy.discountFor(subtotal);
      if (cents > 0 && (!best || cents > best.cents)) best = { code: policy.code, cents };
    }

    return {
      subtotalCents: subtotal,
      discountCents: best?.cents ?? 0,
      payableCents: subtotal - (best?.cents ?? 0),
      appliedCode: best?.code ?? null
    };
  }
}
