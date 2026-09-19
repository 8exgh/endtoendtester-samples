import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client, Pool } from 'pg';
import { MIGRATIONS } from './schema';

/* Starting a real Postgres, from the same image production would run.
   https://endtoendtester.com/tools/testcontainers */

export async function startPostgres(): Promise<StartedPostgreSqlContainer> {
  return new PostgreSqlContainer('postgres:16-alpine').start();
}

/** Applies every migration that has not been applied. Running the real
    migrations is half the point: it proves they produce the schema the
    code expects, which is a common production surprise. */
export async function migrate(connectionUri: string, upTo?: string): Promise<string[]> {
  const client = new Client({ connectionString: connectionUri });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS __migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL)
    `);
    const { rows } = await client.query<{ id: string }>('SELECT id FROM __migrations');
    const applied = new Set(rows.map((r) => r.id));
    const ran: string[] = [];

    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) continue;
      // Migration and its bookkeeping in one transaction, or a crash
      // halfway leaves a schema nobody can reason about.
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query('INSERT INTO __migrations (id, applied_at) VALUES ($1, now())', [migration.id]);
      await client.query('COMMIT');
      ran.push(migration.id);
      if (upTo && migration.id === upTo) break;
    }
    return ran;
  } finally {
    await client.end();
  }
}

export function poolFor(connectionUri: string): Pool {
  return new Pool({ connectionString: connectionUri, max: 8 });
}
