import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { shippingCents, slugify } from './pricing';

/* Deliberately familiar: `vi` replaces `jest` as the mocking namespace and
   the methods line up, which is what makes most Jest test bodies port by
   changing an import. https://endtoendtester.com/tools/vitest */

describe('shippingCents', () => {
  it.each([
    [0, 395],
    [4_999, 395],
    [5_000, 0],
    [12_000, 0]
  ])('charges %i cents shipping on a subtotal of %i', (subtotal, expected) => {
    expect(shippingCents(subtotal)).toBe(expected);
  });

  it('ships a gold customer free whatever the subtotal', () => {
    expect(shippingCents(1, 'gold')).toBe(0);
  });
});

describe('slugify', () => {
  it('produces a url-safe fragment from a title', () => {
    expect(slugify('Arrange, Act, Assert (AAA)')).toBe('arrange-act-assert-aaa');
  });
});

describe('vi, which is jest with a different name', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('controls timers the same way jest does', async () => {
    const tick = vi.fn();
    setTimeout(tick, 1_000);

    expect(tick).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(tick).toHaveBeenCalledOnce();
  });

  it('pins the system clock as well as the timers', () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));

    expect(new Date().toISOString()).toBe('2026-01-01T12:00:00.000Z');
  });

  it('spies on a method and restores it afterwards', () => {
    const rates = { gbp: () => 0.79 };
    const spy = vi.spyOn(rates, 'gbp').mockReturnValue(0.5);

    expect(rates.gbp()).toBe(0.5);
    spy.mockRestore();
    expect(rates.gbp()).toBe(0.79);
  });
});
