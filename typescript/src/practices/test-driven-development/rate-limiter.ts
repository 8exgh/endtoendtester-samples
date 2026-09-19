/* The end state of the red-green-refactor cycle worked through in the
   article. The clock is injected because the third test could not be
   written otherwise — which is the mechanism by which TDD changes design.
   https://endtoendtester.com/practices/test-driven-development */

export type Clock = () => number;

export interface RateLimiterOptions {
  perMinute: number;
  clock?: Clock;
}

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly clock: Clock;

  constructor(private readonly options: RateLimiterOptions) {
    this.clock = options.clock ?? Date.now;
  }

  allow(key: string): boolean {
    const now = this.clock();
    const windowStart = now - 60_000;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > windowStart);

    if (recent.length >= this.options.perMinute) {
      this.hits.set(key, recent);
      return false;
    }

    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  /** Exposed so a test can prove the window is pruned rather than growing
      forever — a leak no behavioural test would otherwise notice. */
  tracked(key: string): number {
    return (this.hits.get(key) ?? []).length;
  }
}
