/* Functional core, imperative shell.
   https://endtoendtester.com/practices/writing-testable-code

   The decision is a pure function of its inputs, so testing the thirty-day
   rule needs no database, no mail server and no clock injection — just
   three numbers. The shell that performs the effects is left so thin that
   it is obviously correct by inspection. */

export interface Cart {
  id: string;
  email: string;
  updatedAt: number;
}

export interface Expiry {
  cartId: string;
  email: string;
  idleDays: number;
}

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** The decision. Pure, total, and trivially testable at the boundary. */
export function cartsToExpire(carts: Cart[], now: number, ttlMs: number): Expiry[] {
  return carts
    .filter((cart) => now - cart.updatedAt > ttlMs)
    .map((cart) => ({
      cartId: cart.id,
      email: cart.email,
      idleDays: Math.floor((now - cart.updatedAt) / (24 * 60 * 60 * 1000))
    }));
}

export interface Store {
  loadCarts(): Promise<Cart[]>;
  deleteCart(id: string): Promise<void>;
}

export interface Mailer {
  send(to: string, subject: string): Promise<void>;
}

/** The shell. Four lines of effects and no decisions at all. */
export async function expireStaleCarts(store: Store, mailer: Mailer, now = Date.now()) {
  const carts = await store.loadCarts();
  for (const { cartId, email } of cartsToExpire(carts, now, THIRTY_DAYS_MS)) {
    await store.deleteCart(cartId);
    await mailer.send(email, 'Your cart expired');
  }
}
