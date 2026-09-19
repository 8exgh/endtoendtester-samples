import crypto from 'node:crypto';
import type { Pool } from 'pg';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate, poolFor, startPostgres } from '../../_db/postgres';
import { OrderRepository } from '../../_db/order-repository';

/* The layer everything else depends on, and the one most suites replace
   with a mock. https://endtoendtester.com/quality/database-testing */

let container: StartedPostgreSqlContainer;
let pool: Pool;

beforeAll(async () => {
  container = await startPostgres();
  await migrate(container.getConnectionUri());
  pool = poolFor(container.getConnectionUri());
});

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

const ref = () => `REF-${crypto.randomUUID().slice(0, 8)}`;

describe('constraints', () => {
  /* Deliberately bypasses the application: this proves the database itself
     would refuse bad data, which is what protects you from the script
     somebody runs at 3am. */
  it('refuses a negative amount even when the application is bypassed', async () => {
    await expect(
      pool.query(
        `INSERT INTO orders (id, tenant_id, reference, amount_cents, currency, placed_at)
         VALUES ($1, 't', $2, -1, 'GBP', now())`,
        [crypto.randomUUID(), ref()]
      )
    ).rejects.toMatchObject({ code: '23514' }); // check_violation
  });

  it('refuses a null amount', async () => {
    await expect(
      pool.query(
        `INSERT INTO orders (id, tenant_id, reference, amount_cents, currency, placed_at)
         VALUES ($1, 't', $2, NULL, 'GBP', now())`,
        [crypto.randomUUID(), ref()]
      )
    ).rejects.toMatchObject({ code: '23502' }); // not_null_violation
  });
});

describe('concurrency', () => {
  it('lets exactly one of two racing inserts win', async () => {
    const repository = new OrderRepository(pool);
    const [t, r] = [`t-${crypto.randomUUID().slice(0, 8)}`, ref()];
    const order = { tenantId: t, reference: r, amountCents: 1_000, currency: 'GBP', placedAt: new Date() };

    const results = await Promise.allSettled([
      repository.save({ ...order, id: crypto.randomUUID() }),
      repository.save({ ...order, id: crypto.randomUUID() })
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);

    const { rows } = await pool.query('SELECT count(*)::int AS n FROM orders WHERE tenant_id = $1', [t]);
    expect(rows[0].n).toBe(1);
  });
});

describe('query plans', () => {
  /* Assert on the plan, not the wall clock: timing on a CI runner is noise,
     and a dropped index is a permanent, silent performance regression. */
  it('uses the index rather than scanning the table', async () => {
    const tenant = `t-plan-${crypto.randomUUID().slice(0, 8)}`;
    for (let i = 0; i < 200; i++) {
      await pool.query(
        `INSERT INTO orders (id, tenant_id, reference, amount_cents, currency, placed_at)
         VALUES ($1, $2, $3, $4, 'GBP', now() - ($5 || ' minutes')::interval)`,
        [crypto.randomUUID(), tenant, `${tenant}-${i}`, 100 + i, String(i)]
      );
    }
    await pool.query('ANALYZE orders');

    const { rows } = await pool.query(
      `EXPLAIN (FORMAT JSON)
         SELECT * FROM orders WHERE tenant_id = $1 ORDER BY placed_at DESC LIMIT 20`,
      [tenant]
    );

    const plan = JSON.stringify(rows[0]['QUERY PLAN']);
    expect(plan).not.toContain('Seq Scan');
  });
});

describe('isolation', () => {
  it('a rolled-back transaction leaves nothing behind', async () => {
    const t = `t-rollback-${crypto.randomUUID().slice(0, 8)}`;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO orders (id, tenant_id, reference, amount_cents, currency, placed_at)
         VALUES ($1, $2, $3, 100, 'GBP', now())`,
        [crypto.randomUUID(), t, ref()]
      );
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    const { rows } = await pool.query('SELECT count(*)::int AS n FROM orders WHERE tenant_id = $1', [t]);
    expect(rows[0].n).toBe(0);
  });
});
