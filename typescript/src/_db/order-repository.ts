import type { Pool } from 'pg';

export class DuplicateReferenceError extends Error {
  constructor(readonly reference: string) {
    super(`order reference already used: ${reference}`);
  }
}

export interface OrderRow {
  id: string;
  tenantId: string;
  reference: string;
  amountCents: number;
  currency: string;
  placedAt: Date;
}

/* The seam. Its job is to translate infrastructure errors into domain ones,
   which is a behaviour worth a test of its own — a raw SQLState leaking to
   a caller is a bug, not an implementation detail. */
export class OrderRepository {
  constructor(private readonly pool: Pool) {}

  async save(order: OrderRow): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO orders (id, tenant_id, reference, amount_cents, currency, placed_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, order.tenantId, order.reference, order.amountCents, order.currency, order.placedAt]
      );
    } catch (error) {
      // 23505 = unique_violation
      if ((error as { code?: string }).code === '23505') {
        throw new DuplicateReferenceError(order.reference);
      }
      throw error;
    }
  }

  async find(tenantId: string, reference: string): Promise<OrderRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, reference, amount_cents, currency, placed_at
         FROM orders WHERE tenant_id = $1 AND reference = $2`,
      [tenantId, reference]
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      reference: row.reference,
      // bigint comes back as a string from pg, which is the correct default
      // and a classic source of "1200" + 395 = "1200395".
      amountCents: Number(row.amount_cents),
      currency: row.currency,
      placedAt: row.placed_at
    };
  }

  async recentFor(tenantId: string, limit: number): Promise<OrderRow[]> {
    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, reference, amount_cents, currency, placed_at
         FROM orders WHERE tenant_id = $1 ORDER BY placed_at DESC LIMIT $2`,
      [tenantId, limit]
    );
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      reference: row.reference,
      amountCents: Number(row.amount_cents),
      currency: row.currency,
      placedAt: row.placed_at
    }));
  }
}
