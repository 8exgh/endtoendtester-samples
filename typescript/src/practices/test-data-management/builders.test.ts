import { aCustomer, aLine, anOrder, totalCents } from './builders';

/* https://endtoendtester.com/practices/test-data-management */

describe('builders', () => {
  /* The reader's eye goes to `tier`, because that is the only thing the
     test said out loud. */
  it('lets a test name only the field it is about', () => {
    const order = anOrder({ customer: aCustomer({ tier: 'gold' }) });

    expect(order.customer.tier).toBe('gold');
    expect(order.status).toBe('reserved');
    expect(order.lines).toHaveLength(1);
  });

  it('composes without the test knowing the shape of the graph', () => {
    const order = anOrder({
      lines: [aLine({ unitCents: 2_000, quantity: 3 }), aLine({ unitCents: 500 })]
    });

    expect(totalCents(order)).toBe(6_500);
  });

  /* The habit that makes a suite parallel-safe, asserted rather than
     assumed. Retrofitting it across four hundred tests is a miserable job. */
  it('never produces the same unique value twice across many draws', () => {
    const emails = new Set<string>();
    const references = new Set<string>();

    for (let i = 0; i < 5_000; i++) {
      emails.add(aCustomer().email);
      references.add(anOrder().reference);
    }

    expect(emails.size).toBe(5_000);
    expect(references.size).toBe(5_000);
  });

  it('gives every builder a default that is valid on its own', () => {
    expect(() => totalCents(anOrder())).not.toThrow();
    expect(totalCents(anOrder())).toBeGreaterThan(0);
  });

  it('does not share a mutable default between two calls', () => {
    const first = anOrder();
    const second = anOrder();

    first.lines.push(aLine());

    expect(second.lines).toHaveLength(1);
  });
});
