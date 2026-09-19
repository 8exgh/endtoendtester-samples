import crypto from 'node:crypto';
import type { Pool } from 'pg';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate, poolFor, startPostgres } from '../../_db/postgres';
import { DuplicateReferenceError, OrderRepository } from '../../_db/order-repository';

// Pulling and starting Postgres happens in a hook, and a project-level
// `testTimeout` is not applied to hooks — so it is set explicitly here.
jest.setTimeout(180_000);

/* Your code against a real dependency. The bugs this catches are boring,
   frequent, and invisible from below — because a double is built from the
   same wrong assumption as the code.
   https://endtoendtester.com/testing-levels/integration-testing */

let container: StartedPostgreSqlContainer;
let pool: Pool;
let repository: OrderRepository;

// One container for the file, not one per test: startup dominates the
// runtime and this is the difference between 4 seconds and 40.
beforeAll(async () => {
  container = await startPostgres();
  await migrate(container.getConnectionUri());
  pool = poolFor(container.getConnectionUri());
  repository = new OrderRepository(pool);
});

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

// Unique per test rather than truncating: parallel-safe by construction.
const ref = () => `REF-${crypto.randomUUID().slice(0, 8)}`;
const tenant = () => `t-${crypto.randomUUID().slice(0, 8)}`;

describe('OrderRepository', () => {
  it('round-trips money without losing a penny', async () => {
    const [t, r] = [tenant(), ref()];

    await repository.save({
      id: crypto.randomUUID(),
      tenantId: t,
      reference: r,
      amountCents: 199_999,
      currency: 'GBP',
      placedAt: new Date('2026-01-01T12:00:00Z')
    });

    const found = await repository.find(t, r);
    expect(found?.amountCents).toBe(199_999);
    // The bigint-as-string trap: a wrong mapping makes this a string.
    expect(typeof found?.amountCents).toBe('number');
  });

  it('keeps the instant a timestamp described, across the timezone boundary', async () => {
    const [t, r] = [tenant(), ref()];
    const placedAt = new Date('2026-06-15T23:30:00Z');

    await repository.save({
      id: crypto.randomUUID(),
      tenantId: t,
      reference: r,
      amountCents: 1_200,
      currency: 'GBP',
      placedAt
    });

    // `timestamp` without a zone would silently shift this.
    expect((await repository.find(t, r))!.placedAt.toISOString()).toBe(placedAt.toISOString());
  });

  it('translates a unique violation into a domain error', async () => {
    const [t, r] = [tenant(), ref()];
    const order = {
      id: crypto.randomUUID(),
      tenantId: t,
      reference: r,
      amountCents: 4_000,
      currency: 'GBP',
      placedAt: new Date()
    };

    await repository.save(order);

    // Not a raw SQLState leaking to the caller.
    await expect(repository.save({ ...order, id: crypto.randomUUID() })).rejects.toBeInstanceOf(
      DuplicateReferenceError
    );
  });

  it('scopes the same reference per tenant, which is what the key is for', async () => {
    const r = ref();
    const base = { reference: r, amountCents: 1_000, currency: 'GBP', placedAt: new Date() };

    await repository.save({ ...base, id: crypto.randomUUID(), tenantId: 'tenant-a' + r });
    await repository.save({ ...base, id: crypto.randomUUID(), tenantId: 'tenant-b' + r });

    expect(await repository.find('tenant-a' + r, r)).not.toBeNull();
    expect(await repository.find('tenant-b' + r, r)).not.toBeNull();
  });

  it('applies the real migrations, and applying them twice is a no-op', async () => {
    const ran = await migrate(container.getConnectionUri());

    expect(ran).toEqual([]); // everything was applied in beforeAll
  });

  it('defaults the currency added by migration 002', async () => {
    const [t, r] = [tenant(), ref()];
    await pool.query(
      `INSERT INTO orders (id, tenant_id, reference, amount_cents, placed_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [crypto.randomUUID(), t, r, 500, new Date()]
    );

    expect((await repository.find(t, r))!.currency).toBe('GBP');
  });
});
