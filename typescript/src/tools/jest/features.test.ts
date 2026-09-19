import { retryWithBackoff } from './retry';

/* The Jest features worth knowing, exercised rather than described.
   https://endtoendtester.com/tools/jest */

describe('parameterisation', () => {
  it.each([
    [12_000, 2_400],
    [10_000, 2_000],
    [9_999, 0]
  ])('discounts a subtotal of %i by %i', (subtotal, expected) => {
    const discount = subtotal >= 10_000 ? Math.round(subtotal * 0.2) : 0;

    expect(discount).toBe(expected);
  });

  // The tagged-template form, when the columns deserve names.
  it.each`
    tier          | shippingCents
    ${'standard'} | ${395}
    ${'gold'}     | ${0}
  `('charges $shippingCents shipping for a $tier customer', ({ tier, shippingCents }) => {
    expect(tier === 'gold' ? 0 : 395).toBe(shippingCents);
  });
});

describe('fake timers', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  /* advanceTimersByTimeAsync, not the synchronous version: the code under
     test awaits between timers, and the sync form leaves those promise
     callbacks unflushed and hangs. */
  it('waits a second, then two, then succeeds without any real waiting', async () => {
    const attempt = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('503'))
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue('ok');

    const promise = retryWithBackoff(attempt, { retries: 2, baseMs: 1_000 });

    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(2_000);

    await expect(promise).resolves.toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('gives up once the retries are spent', async () => {
    const attempt = jest.fn<Promise<string>, []>().mockRejectedValue(new Error('503'));

    const promise = retryWithBackoff(attempt, { retries: 1, baseMs: 10 });
    const assertion = expect(promise).rejects.toThrow('503');
    await jest.advanceTimersByTimeAsync(10);
    await assertion;

    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('can pin the wall clock as well as the timers', () => {
    jest.setSystemTime(new Date('2026-01-01T12:00:00Z'));

    expect(new Date().toISOString()).toBe('2026-01-01T12:00:00.000Z');
  });
});

describe('matchers worth reaching for', () => {
  const order = { id: 'ORD-1', status: 'paid', totalCents: 2_795, placedAt: new Date() };

  /* toMatchObject ignores fields the test does not care about, so adding
     one to the type does not break every assertion in the suite. */
  it('asserts on the fields it cares about and ignores the rest', () => {
    expect(order).toMatchObject({ status: 'paid' });
  });

  it('matches inside an array without pinning the order', () => {
    const items = [{ sku: 'a' }, { sku: 'b' }];

    expect(items).toEqual(expect.arrayContaining([expect.objectContaining({ sku: 'b' })]));
  });

  it('compares floating point with a tolerance rather than exactly', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(0.1 + 0.2).toBeCloseTo(0.3, 10);
  });

  it('asserts on a rejected promise without a try/catch', async () => {
    await expect(Promise.reject(new TypeError('nope'))).rejects.toBeInstanceOf(TypeError);
  });
});
