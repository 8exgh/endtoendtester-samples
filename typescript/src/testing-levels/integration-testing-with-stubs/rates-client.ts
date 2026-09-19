/* The client under test. A stub replaces the far side of the socket, so
   everything here — serialization, timeouts, retries, error mapping — runs
   for real. Mocking this class instead would skip all of it, which is
   where the bugs are.
   https://endtoendtester.com/testing-levels/integration-testing-with-stubs */

export class RatesUnavailableError extends Error {}
export class RatesTimeoutError extends Error {}
export class RateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super(`rate limited for ${retryAfterSeconds}s`);
  }
}

export interface RatesClientOptions {
  timeoutMs?: number;
  retries?: number;
}

export class RatesClient {
  readonly attempts: number[] = [];

  constructor(
    private readonly baseUrl: string,
    private readonly options: RatesClientOptions = {}
  ) {}

  async gbpRate(): Promise<number> {
    const timeoutMs = this.options.timeoutMs ?? 1_000;
    const retries = this.options.retries ?? 0;
    let lastError: Error = new RatesUnavailableError('never attempted');

    for (let attempt = 0; attempt <= retries; attempt++) {
      this.attempts.push(Date.now());
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}/v1/rates?base=USD`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        });

        if (response.status === 429) {
          // Not retried: the server has told us how long to wait, and
          // hammering it is how a rate limit becomes a ban.
          throw new RateLimitedError(Number(response.headers.get('retry-after') ?? 60));
        }
        if (!response.ok) {
          lastError = new RatesUnavailableError(`upstream returned ${response.status}`);
          continue;
        }

        const body = (await response.json()) as { rates?: { GBP?: number } };
        const rate = body.rates?.GBP;
        if (typeof rate !== 'number') {
          throw new RatesUnavailableError('response did not contain a GBP rate');
        }
        return rate;
      } catch (error) {
        if (error instanceof RateLimitedError) throw error;

        /* Detecting a timeout is not as simple as `error.name === 'AbortError'`.
           Node's fetch (undici) wraps the abort: what reaches here is often a
           plain `TypeError: fetch failed` whose `cause` is the AbortError. The
           signal itself is the reliable witness, and this is exactly the kind
           of thing only a test against a real socket finds. */
        if (controller.signal.aborted) {
          lastError = new RatesTimeoutError(`no response within ${timeoutMs}ms`);
          continue;
        }
        lastError = error instanceof Error ? error : new RatesUnavailableError(String(error));
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError;
  }
}
