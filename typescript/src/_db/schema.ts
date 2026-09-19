/* Migrations, applied in order, recorded by id. Never edited once applied —
   the same rule the site's own event store follows. */

export interface Migration {
  id: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: '001-orders',
    sql: `
      CREATE TABLE orders (
        id            uuid PRIMARY KEY,
        tenant_id     text NOT NULL,
        reference     text NOT NULL,
        -- bigint, not numeric and certainly not double precision: money in
        -- minor units is an integer, and a float will eventually lose a penny.
        amount_cents  bigint NOT NULL CHECK (amount_cents >= 0),
        -- timestamptz, not timestamp: the sample asserts the offset survives.
        placed_at     timestamptz NOT NULL,
        UNIQUE (tenant_id, reference)
      );
      CREATE INDEX orders_tenant_placed ON orders (tenant_id, placed_at DESC);
    `
  },
  {
    id: '002-currency',
    sql: `
      ALTER TABLE orders ADD COLUMN currency char(3);
      UPDATE orders SET currency = 'GBP' WHERE currency IS NULL;
      ALTER TABLE orders ALTER COLUMN currency SET NOT NULL;
      ALTER TABLE orders ALTER COLUMN currency SET DEFAULT 'GBP';
    `
  }
];
