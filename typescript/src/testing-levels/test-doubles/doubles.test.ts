import { Shipping, type Clock, type Logger, type Mailer, type Message, type Order, type OrderRepository } from './doubles';

/* https://endtoendtester.com/testing-levels/test-doubles */

const anOrder = (overrides: Partial<Order> = {}): Order => ({
  reference: 'REF-1',
  email: 'buyer@example.test',
  amountCents: 2_400,
  status: 'reserved',
  ...overrides
});

/* ---- Dummy: passed, never used ------------------------------------ */
const dummyLogger = null as unknown as Logger;

/* ---- Stub: canned answers, never asserted on ----------------------- */
const frozenClock: Clock = { now: () => Date.parse('2026-01-01T12:00:00Z') };

/* ---- Spy: records what happened, checked afterwards ---------------- */
class RecordingMailer implements Mailer {
  readonly sent: Message[] = [];
  async send(message: Message) {
    this.sent.push(message);
  }
}

/* ---- Fake: a real, simplified implementation ----------------------- */
class InMemoryOrderRepository implements OrderRepository {
  private readonly rows = new Map<string, Order>();
  nextFailure: Error | null = null;

  constructor(seed: Order[] = []) {
    for (const order of seed) this.rows.set(order.reference, order);
  }

  async find(reference: string) {
    return this.rows.get(reference) ?? null;
  }

  async save(order: Order) {
    if (this.nextFailure) {
      const failure = this.nextFailure;
      this.nextFailure = null;
      throw failure;
    }
    this.rows.set(order.reference, order);
  }

  /** The assertion surface, in domain terms rather than call counts. */
  get all(): Order[] {
    return [...this.rows.values()];
  }
}

describe('test doubles', () => {
  it('stub + spy + fake: the ordinary case', async () => {
    const orders = new InMemoryOrderRepository([anOrder()]);
    const mailer = new RecordingMailer();

    const shipped = await new Shipping(orders, mailer, frozenClock, dummyLogger).ship('REF-1');

    // The stubbed clock shows up in the outcome, not in an assertion on the stub.
    expect(shipped.shippedAt).toBe(Date.parse('2026-01-01T12:00:00Z'));
    // The fake is asserted on by its state.
    expect(orders.all).toEqual([expect.objectContaining({ status: 'shipped' })]);
    // The spy is asserted on after the fact, and reads like a state assertion.
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].subject).toContain('on its way');
  });

  it('a fake can fail on demand, which a stub cannot', async () => {
    const orders = new InMemoryOrderRepository([anOrder()]);
    orders.nextFailure = new Error('deadlock detected');

    await expect(
      new Shipping(orders, new RecordingMailer(), frozenClock, dummyLogger).ship('REF-1')
    ).rejects.toThrow('deadlock detected');

    expect(orders.all[0].status).toBe('reserved');
  });

  it('no email goes out when nothing changed — the idempotent re-entry', async () => {
    const orders = new InMemoryOrderRepository([anOrder({ status: 'shipped', shippedAt: 1 })]);
    const mailer = new RecordingMailer();

    await new Shipping(orders, mailer, frozenClock, dummyLogger).ship('REF-1');

    expect(mailer.sent).toHaveLength(0);
  });

  /* ---- Mock: expectations set in advance --------------------------- */
  it('mock: the interaction itself is the rule being tested', async () => {
    const orders = new InMemoryOrderRepository([anOrder()]);
    const send = jest.fn<Promise<void>, [Message]>().mockResolvedValue(undefined);

    await new Shipping(orders, { send }, frozenClock, dummyLogger).ship('REF-1');

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'buyer@example.test' }));
  });
});
