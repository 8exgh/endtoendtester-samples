import { Account } from './account';

/* Three parts, one blank line between each, and an act step that is one
   line — which is what keeps the test to one reason to fail.
   https://endtoendtester.com/practices/arrange-act-assert */

describe('Account.withdraw', () => {
  it('refuses a withdrawal that would overdraw the account', () => {
    const account = new Account({ balanceCents: 5_000, overdraftCents: 0 });

    const result = account.withdraw(5_001);

    expect(result).toEqual({ ok: false, reason: 'insufficient-funds' });
    expect(account.balanceCents).toBe(5_000);
  });

  it('allows a withdrawal into an agreed overdraft', () => {
    const account = new Account({ balanceCents: 5_000, overdraftCents: 2_000 });

    const result = account.withdraw(7_000);

    expect(result).toEqual({ ok: true, balanceCents: -2_000 });
  });

  /* Three assertions about one outcome is fine. The rule people quote as
     "one assertion per test" is a proxy for "one reason to fail". */
  it('debits exactly the amount asked for', () => {
    const account = new Account({ balanceCents: 5_000, overdraftCents: 0 });

    const result = account.withdraw(1_250);

    expect(result.ok).toBe(true);
    expect(account.balanceCents).toBe(3_750);
    expect(result).toMatchObject({ balanceCents: 3_750 });
  });

  /* A loop with an assertion inside is one test that fails without saying
     which case broke. `it.each` makes each case its own reported test. */
  it.each([
    [0, 'not-a-positive-amount'],
    [-100, 'not-a-positive-amount'],
    [1.5, 'not-a-positive-amount']
  ])('refuses a withdrawal of %p', (amount, reason) => {
    const account = new Account({ balanceCents: 5_000, overdraftCents: 0 });

    const result = account.withdraw(amount);

    expect(result).toEqual({ ok: false, reason });
  });
});
