import { RateLimiter } from './rate-limiter';

/* The tests in the order they were written, which is the point.
   https://endtoendtester.com/practices/test-driven-development */

describe('RateLimiter', () => {
  it('allows the first request', () => {
    const limiter = new RateLimiter({ perMinute: 3, clock: () => 0 });

    expect(limiter.allow('alice')).toBe(true);
  });

  it('refuses the fourth request in the same minute', () => {
    const limiter = new RateLimiter({ perMinute: 3, clock: () => 0 });

    limiter.allow('alice');
    limiter.allow('alice');
    limiter.allow('alice');

    expect(limiter.allow('alice')).toBe(false);
  });

  /* The test that forced the design: there is no way to write it without
     the clock being injectable. */
  it('forgets a request once its minute has passed', () => {
    let now = Date.parse('2026-01-01T12:00:00Z');
    const limiter = new RateLimiter({ perMinute: 1, clock: () => now });

    limiter.allow('alice');
    now += 61_000;

    expect(limiter.allow('alice')).toBe(true);
  });

  it('still refuses one millisecond inside the window', () => {
    let now = 0;
    const limiter = new RateLimiter({ perMinute: 1, clock: () => now });

    limiter.allow('alice');
    now += 59_999;

    expect(limiter.allow('alice')).toBe(false);
  });

  it('counts each key separately', () => {
    const limiter = new RateLimiter({ perMinute: 1, clock: () => 0 });

    expect(limiter.allow('alice')).toBe(true);
    expect(limiter.allow('bob')).toBe(true);
    expect(limiter.allow('alice')).toBe(false);
  });

  /* The refactor step, made safe: pruning is an internal change, and this
     is the test that says it happened. */
  it('prunes old timestamps instead of growing forever', () => {
    let now = 0;
    const limiter = new RateLimiter({ perMinute: 100, clock: () => now });

    for (let i = 0; i < 50; i++) {
      limiter.allow('alice');
      now += 1_000;
    }
    now += 61_000;
    limiter.allow('alice');

    expect(limiter.tracked('alice')).toBe(1);
  });
});
