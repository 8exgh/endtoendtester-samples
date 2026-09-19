import type { APIRequestContext } from '@playwright/test';

/* Arranging through the API. Creating a basket through the UI takes
   seconds and makes every checkout test depend on the product page.
   https://endtoendtester.com/testing-levels/end-to-end-testing */

export async function seedCart(
  request: APIRequestContext,
  session: string,
  lines: { slug: string; quantity: number }[]
) {
  for (const line of lines) {
    const response = await request.post('/api/cart', { data: { session, ...line } });
    if (!response.ok()) throw new Error(`could not seed cart: ${response.status()}`);
  }
}

/** Unique per worker and per call, so parallel runs cannot collide.
    https://endtoendtester.com/practices/parallel-test-execution */
export const newSession = (workerIndex: number) =>
  `w${workerIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
