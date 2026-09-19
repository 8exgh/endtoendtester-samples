/* A job that finishes after a variable delay — the shape of every real
   asynchronous system, and the thing a fixed sleep guesses at.
   https://endtoendtester.com/practices/flaky-tests */

export interface Job {
  status: 'running' | 'done';
  result?: string;
}

export function startJob(takesMs: number, setTimeoutFn = setTimeout): Job {
  const job: Job = { status: 'running' };
  setTimeoutFn(() => {
    job.status = 'done';
    job.result = 'finished';
  }, takesMs);
  return job;
}

/* ---- The flaky way: wait for a duration ---------------------------- */

export async function readAfterSleeping(job: Job, sleepMs: number): Promise<string | undefined> {
  await new Promise((resolve) => setTimeout(resolve, sleepMs));
  return job.result;
}

/* ---- The stable way: wait for a condition -------------------------- */

export async function waitFor<T>(
  read: () => T | undefined,
  { timeoutMs = 2_000, intervalMs = 5 } = {}
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = read();
    if (value !== undefined) return value;
    if (Date.now() > deadline) {
      throw new Error(`condition was still not true after ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
