import { buildOrdersQuery, formatInvoice, type Invoice } from './invoice';

/* Inline snapshots only: the expected value sits next to the assertion, so
   a pull request shows the change in context rather than in a .snap file
   reviewers skip. https://endtoendtester.com/web-frameworks/snapshot-testing */

const invoice: Invoice = {
  reference: 'INV-1',
  issuedOn: '1 January 2026',
  lines: [
    { description: 'Field Notes', quantity: 2, unitCents: 1_200 },
    { description: 'Pencil, blackwing', quantity: 1, unitCents: 500 }
  ],
  shippingCents: 395
};

describe('formatInvoice', () => {
  /* Large, readable, and every character of it meaningful — the case where
     a snapshot beats twelve hand-written assertions. */
  it('lays out an invoice a human can read', () => {
    expect(formatInvoice(invoice)).toMatchInlineSnapshot(`
"Invoice INV-1                         1 January 2026
 --------------------------------------------------
 Field Notes                   2 x £12.00     £24.00
 Pencil, blackwing              1 x £5.00      £5.00
 Shipping                                      £3.95
 --------------------------------------------------
 Total                                        £32.95"
`);
  });

  /* Small and meaningful beats large and comprehensive: this is the whole
     assertion, and its diff is one line. */
  it('builds the orders query with only the filters it was given', () => {
    expect(buildOrdersQuery({ tenantId: 't1' })).toMatchInlineSnapshot(
      `"SELECT * FROM orders WHERE tenant_id = $1 ORDER BY placed_at DESC"`
    );
  });

  it('adds the status filter as a second parameter, not as interpolated text', () => {
    expect(buildOrdersQuery({ tenantId: 't1', status: 'paid' })).toMatchInlineSnapshot(
      `"SELECT * FROM orders WHERE tenant_id = $1 AND status = $2 ORDER BY placed_at DESC"`
    );
  });
});

describe('keeping a snapshot honest', () => {
  /* A snapshot of anything non-deterministic is a flaky test with extra
     steps. Property matchers pin the parts that vary. */
  it('pins the fields that vary rather than snapshotting them', () => {
    const receipt = { id: crypto.randomUUID(), paidAt: new Date(), totalCents: 3_295 };

    expect(receipt).toMatchSnapshot({ id: expect.any(String), paidAt: expect.any(Date) });
  });
});
