import { cartsToExpire, expireStaleCarts, THIRTY_DAYS_MS, type Cart } from './carts';

/* https://endtoendtester.com/practices/writing-testable-code */

const NOW = Date.parse('2026-02-01T00:00:00Z');
const daysAgo = (days: number) => NOW - days * 24 * 60 * 60 * 1000;

const aCart = (overrides: Partial<Cart> = {}): Cart => ({
  id: 'cart-1',
  email: 'buyer@example.test',
  updatedAt: daysAgo(1),
  ...overrides
});

describe('cartsToExpire — the decision', () => {
  it('expires a cart untouched for longer than the window', () => {
    const carts = [aCart({ id: 'old', updatedAt: daysAgo(31) })];

    expect(cartsToExpire(carts, NOW, THIRTY_DAYS_MS)).toEqual([
      { cartId: 'old', email: 'buyer@example.test', idleDays: 31 }
    ]);
  });

  /* Exactly thirty days is the boundary, and `>` versus `>=` lives here.
     One line, because the decision is a pure function. */
  it('leaves a cart at exactly the window alone', () => {
    const carts = [aCart({ updatedAt: daysAgo(30) })];

    expect(cartsToExpire(carts, NOW, THIRTY_DAYS_MS)).toEqual([]);
  });

  it.each([
    ['an empty list', [] as Cart[], 0],
    ['nothing stale', [aCart()], 0],
    ['a cart updated in the future', [aCart({ updatedAt: NOW + 1_000 })], 0]
  ])('expires nothing given %s', (_name, carts, expected) => {
    expect(cartsToExpire(carts, NOW, THIRTY_DAYS_MS)).toHaveLength(expected);
  });
});

describe('expireStaleCarts — the shell', () => {
  /* One test, because there is one thing left to get wrong: whether the
     effects happen for the carts the decision chose. */
  it('deletes and notifies exactly what the decision selected', async () => {
    const deleted: string[] = [];
    const mailed: string[] = [];

    await expireStaleCarts(
      {
        loadCarts: async () => [
          aCart({ id: 'fresh', updatedAt: daysAgo(1) }),
          aCart({ id: 'stale', email: 'stale@example.test', updatedAt: daysAgo(45) })
        ],
        deleteCart: async (id) => void deleted.push(id)
      },
      { send: async (to) => void mailed.push(to) },
      NOW
    );

    expect(deleted).toEqual(['stale']);
    expect(mailed).toEqual(['stale@example.test']);
  });
});
