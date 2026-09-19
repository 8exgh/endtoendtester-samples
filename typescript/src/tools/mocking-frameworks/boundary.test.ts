/* The rule that resolves most arguments about mocking: double what crosses
   a process boundary, construct everything else.
   https://endtoendtester.com/tools/mocking-frameworks */

interface Clock {
  now(): number;
}
interface Mailer {
  send(to: string, subject: string): Promise<void>;
}

/** A value object you own. Never worth doubling. */
class Money {
  constructor(readonly cents: number) {}
  plus(other: Money) {
    return new Money(this.cents + other.cents);
  }
  toString() {
    return `£${(this.cents / 100).toFixed(2)}`;
  }
}

/** A domain entity you own. Also never worth doubling. */
class Subscription {
  constructor(
    readonly email: string,
    readonly renewsAt: number,
    readonly priceCents: number
  ) {}
  isDueBy(instant: number) {
    return this.renewsAt <= instant;
  }
}

class Renewals {
  constructor(
    private readonly clock: Clock, // across the boundary: doubled
    private readonly mailer: Mailer // across the boundary: doubled
  ) {}

  async remind(subscriptions: Subscription[]): Promise<Money> {
    const now = this.clock.now();
    let total = new Money(0);

    for (const subscription of subscriptions.filter((s) => s.isDueBy(now))) {
      total = total.plus(new Money(subscription.priceCents));
      await this.mailer.send(subscription.email, `Your subscription renews at ${new Money(subscription.priceCents)}`);
    }

    return total;
  }
}

describe('the boundary rule', () => {
  const NOW = Date.parse('2026-01-15T00:00:00Z');
  const frozen: Clock = { now: () => NOW };

  /* Money and Subscription are real. Only the clock and the mailer — the
     two things that cross a boundary — are doubled. */
  it('uses real value objects and doubles only what does I/O', async () => {
    const sent: string[] = [];
    const mailer: Mailer = { send: async (to) => void sent.push(to) };

    const total = await new Renewals(frozen, mailer).remind([
      new Subscription('due@example.test', NOW - 1, 900),
      new Subscription('later@example.test', NOW + 86_400_000, 1_200)
    ]);

    expect(total.toString()).toBe('£9.00');
    expect(sent).toEqual(['due@example.test']);
  });

  it('exercises the real formatting rather than a stubbed string', async () => {
    const subjects: string[] = [];

    await new Renewals(frozen, { send: async (_to, subject) => void subjects.push(subject) }).remind([
      new Subscription('a@example.test', NOW, 1_999)
    ]);

    expect(subjects[0]).toBe('Your subscription renews at £19.99');
  });

  it('treats a renewal due exactly now as due', async () => {
    const sent: string[] = [];

    await new Renewals(frozen, { send: async (to) => void sent.push(to) }).remind([
      new Subscription('boundary@example.test', NOW, 100)
    ]);

    expect(sent).toEqual(['boundary@example.test']);
  });
});

describe('a double that lies, which is the risk with all of them', () => {
  /* A stub returns what you told it to. If the real mailer throws on a
     bounced address, the stub never will — which is why a mock-heavy unit
     test needs a real integration test behind it. */
  it('cannot tell you what the real collaborator does on failure', async () => {
    const throwingMailer: Mailer = {
      send: async () => {
        throw new Error('550 mailbox unavailable');
      }
    };

    await expect(
      new Renewals({ now: () => 0 }, throwingMailer).remind([new Subscription('x@example.test', 0, 100)])
    ).rejects.toThrow('550');
  });
});
