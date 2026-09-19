import { readAfterSleeping, startJob, waitFor } from './async-work';

/* Waiting for the wrong thing is the single most common cause of a flaky
   test. Both halves are demonstrated here deterministically — no test in
   this file is itself flaky. https://endtoendtester.com/practices/flaky-tests */

describe('waiting for a duration', () => {
  /* The bug, made deterministic: on a loaded CI machine the work takes
     longer than the guess, and the test reads nothing. A real suite meets
     this occasionally; here it is pinned so it can be shown. */
  it('reads nothing when the work outlasts the guess', async () => {
    const job = startJob(80);

    const result = await readAfterSleeping(job, 20);

    expect(result).toBeUndefined();
  });

  it('happens to work when the guess is generous, which is why it survives', async () => {
    const job = startJob(20);

    const result = await readAfterSleeping(job, 200);

    expect(result).toBe('finished');
  });
});

describe('waiting for a condition', () => {
  it('returns as soon as the work is done, however long it took', async () => {
    const job = startJob(80);

    const result = await waitFor(() => job.result);

    expect(result).toBe('finished');
  });

  it('is faster than a generous sleep, not slower', async () => {
    const job = startJob(30);

    const started = Date.now();
    await waitFor(() => job.result);
    const elapsed = Date.now() - started;

    // Generous bound: the point is that it returns when ready rather than
    // sitting out a fixed 500ms, not that it hits a precise number.
    expect(elapsed).toBeLessThan(400);
  });

  it('fails with a message that says what it was waiting for', async () => {
    const neverFinishes = { result: undefined as string | undefined };

    await expect(waitFor(() => neverFinishes.result, { timeoutMs: 50 })).rejects.toThrow(
      /still not true after 50ms/
    );
  });

  /* The check worth running against a test you suspect: the same thing,
     many times, with the timing varying underneath it. */
  it('is stable across 200 runs with randomised timings', async () => {
    const outcomes = await Promise.all(
      Array.from({ length: 200 }, async () => {
        const job = startJob(Math.floor(Math.random() * 60));
        return waitFor(() => job.result, { timeoutMs: 1_000 });
      })
    );

    expect(new Set(outcomes)).toEqual(new Set(['finished']));
  });
});
