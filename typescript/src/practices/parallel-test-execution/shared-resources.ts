import { createServer, type Server } from 'node:http';
import crypto from 'node:crypto';

/* The three things that clash the moment a suite runs concurrently.
   https://endtoendtester.com/practices/parallel-test-execution */

/** Port 0 asks the OS for a free port. A hardcoded port is the most common
    reason a suite cannot be sharded. */
export async function listenOnEphemeralPort(): Promise<{ server: Server; port: number }> {
  const server = createServer((_req, res) => res.end('ok'));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port assigned');
  return { server, port: address.port };
}

/** Unique by construction, including the worker index, so two shards on two
    machines cannot collide either. */
export function uniqueEmail(workerId: string | number = process.env.JEST_WORKER_ID ?? '0'): string {
  return `buyer-${workerId}-${crypto.randomUUID().slice(0, 8)}@example.test`;
}

/* ---- Shared mutable state: the invisible one ----------------------- */

/** The bug. A module-level counter is shared by every test in the process. */
const processWideCounter = { value: 0 };
export const bumpSharedCounter = () => ++processWideCounter.value;
export const readSharedCounter = () => processWideCounter.value;

/** The fix: state that belongs to a scope the caller owns. */
export class ScopedCounter {
  private value = 0;
  bump() {
    return ++this.value;
  }
  read() {
    return this.value;
  }
}
