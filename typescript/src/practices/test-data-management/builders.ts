import crypto from 'node:crypto';

/* Builders with meaningful defaults: the test names only what it cares
   about, and everything unique is unique by construction — which is what
   makes the suite safe to parallelise later.
   https://endtoendtester.com/practices/test-data-management */

export interface Customer {
  id: string;
  email: string;
  tier: 'standard' | 'gold';
  createdAt: number;
}

export interface Line {
  sku: string;
  unitCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  reference: string;
  customer: Customer;
  lines: Line[];
  status: 'reserved' | 'paid' | 'cancelled';
}

const unique = () => crypto.randomUUID().slice(0, 8);

export const aCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: crypto.randomUUID(),
  // Unique by construction. Never a literal in a column with a unique key.
  email: `customer-${unique()}@example.test`,
  tier: 'standard',
  createdAt: Date.parse('2026-01-01T00:00:00Z'),
  ...overrides
});

export const aLine = (overrides: Partial<Line> = {}): Line => ({
  sku: `sku-${unique()}`,
  unitCents: 1_200,
  quantity: 1,
  ...overrides
});

export const anOrder = (overrides: Partial<Order> = {}): Order => ({
  id: crypto.randomUUID(),
  reference: `ORD-${unique()}`,
  customer: aCustomer(),
  lines: [aLine()],
  status: 'reserved',
  ...overrides
});

export const totalCents = (order: Order): number =>
  order.lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
