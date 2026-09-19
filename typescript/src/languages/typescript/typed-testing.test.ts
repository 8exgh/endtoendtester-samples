/* What the type system adds to a test, and where it gets in the way.
   https://endtoendtester.com/languages/typescript */

interface ChargeRequest {
  cents: number;
  reference: string;
}
interface ChargeResult {
  ok: boolean;
  id?: string;
}
interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

/* A hand-rolled fake implementing the interface. When PaymentGateway gains
   a method this fails to compile, which is exactly the notification you
   want — a loose mock would silently keep passing. */
class FakeGateway implements PaymentGateway {
  readonly charges: ChargeRequest[] = [];
  private nextFailure: Error | null = null;

  failNext(error: Error) {
    this.nextFailure = error;
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    if (this.nextFailure) {
      const failure = this.nextFailure;
      this.nextFailure = null;
      throw failure;
    }
    this.charges.push(request);
    return { ok: true, id: `pi_${this.charges.length}` };
  }
}

type Outcome =
  | { ok: true; orderId: string }
  | { ok: false; reason: 'declined' | 'insufficient-stock' };

async function pay(gateway: PaymentGateway, cents: number): Promise<Outcome> {
  try {
    const result = await gateway.charge({ cents, reference: `ORD-${cents}` });
    return result.ok ? { ok: true, orderId: result.id! } : { ok: false, reason: 'declined' };
  } catch {
    return { ok: false, reason: 'declined' };
  }
}

describe('typed doubles', () => {
  it('records what it was asked to do, in domain terms', async () => {
    const gateway = new FakeGateway();

    await pay(gateway, 4_000);

    expect(gateway.charges).toEqual([{ cents: 4_000, reference: 'ORD-4000' }]);
  });

  it('can be told to fail without any call-count coupling', async () => {
    const gateway = new FakeGateway();
    gateway.failNext(new Error('network down'));

    await expect(pay(gateway, 4_000)).resolves.toEqual({ ok: false, reason: 'declined' });
  });
});

describe('discriminated unions in assertions', () => {
  /* Modelling the outcome as a union rather than throwing makes the
     error-path tests direct, and the compiler narrows for you. */
  it('narrows the result so the assertion is typed', async () => {
    const gateway = new FakeGateway();
    gateway.failNext(new Error('declined'));

    const result = await pay(gateway, 100);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.reason).toBe('declined');
  });
});

describe('concurrency, which types alone cannot protect you from', () => {
  it('charges once when the same payment is submitted twice at once', async () => {
    const gateway = new FakeGateway();
    const seen = new Set<string>();

    const once = async (cents: number) => {
      const key = `ORD-${cents}`;
      if (seen.has(key)) return { ok: true as const, orderId: 'existing' };
      seen.add(key);
      return pay(gateway, cents);
    };

    await Promise.all([once(4_000), once(4_000)]);

    expect(gateway.charges).toHaveLength(1);
  });
});

describe('asserting on the types themselves', () => {
  it('rejects a payload the contract does not allow', () => {
    // @ts-expect-error cents must be a number, and this line fails the
    // build if that ever stops being true.
    const bad: ChargeRequest = { cents: '4000', reference: 'ORD-1' };

    expect(bad).toBeDefined();
  });

  it('keeps the fake assignable to the interface it fakes', () => {
    const gateway: PaymentGateway = new FakeGateway();

    expect(typeof gateway.charge).toBe('function');
  });
});
