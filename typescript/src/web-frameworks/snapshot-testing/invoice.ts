/* Output that is large, whose correctness criterion is genuinely
   "unchanged since a human checked it", and whose diff is readable. That
   is where a snapshot earns its place.
   https://endtoendtester.com/web-frameworks/snapshot-testing */

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitCents: number;
}

export interface Invoice {
  reference: string;
  issuedOn: string;
  lines: InvoiceLine[];
  shippingCents: number;
}

const money = (cents: number) => `£${(cents / 100).toFixed(2)}`;
const pad = (text: string, width: number) => text.padEnd(width, ' ');
const rightPad = (text: string, width: number) => text.padStart(width, ' ');

export function formatInvoice(invoice: Invoice): string {
  const lines = invoice.lines.map(
    (line) =>
      ` ${pad(line.description, 26)}${rightPad(`${line.quantity} x ${money(line.unitCents)}`, 14)}${rightPad(
        money(line.quantity * line.unitCents),
        11
      )}`
  );
  const subtotal = invoice.lines.reduce((sum, l) => sum + l.quantity * l.unitCents, 0);
  const rule = ' ' + '-'.repeat(50);

  return [
    `Invoice ${invoice.reference}`.padEnd(38) + invoice.issuedOn,
    rule,
    ...lines,
    ` ${pad('Shipping', 40)}${rightPad(money(invoice.shippingCents), 11)}`,
    rule,
    ` ${pad('Total', 40)}${rightPad(money(subtotal + invoice.shippingCents), 11)}`
  ].join('\n');
}

export function buildOrdersQuery(filter: { tenantId: string; status?: string }): string {
  const where = ['tenant_id = $1'];
  if (filter.status) where.push(`status = $${where.length + 1}`);
  return `SELECT * FROM orders WHERE ${where.join(' AND ')} ORDER BY placed_at DESC`;
}
