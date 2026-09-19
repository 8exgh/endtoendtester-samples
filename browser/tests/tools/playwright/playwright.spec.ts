import { expect, test } from '@playwright/test';
import { newSession, seedCart } from '../../../support/api';

/* The two ideas that make Playwright what it is: locators are lazy, and
   assertions retry. https://endtoendtester.com/tools/playwright */

test.describe('web-first assertions', () => {
  test('retries until the confirmation appears, with no waiting code', async ({ page, request }, testInfo) => {
    const session = newSession(testInfo.workerIndex);
    await page.goto('/');
    await page.evaluate((id) => sessionStorage.setItem('session', id), session);
    await seedCart(request, session, [{ slug: 'field-notes', quantity: 1 }]);

    await page.goto('/checkout');
    await page.getByLabel('Card number').fill('4242424242424242');
    await page.getByRole('button', { name: 'Pay' }).click();

    // The server sleeps 250-500ms. No sleep here, and no flakiness either.
    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
  });

  test('reads a value once when asked to, which is the form to avoid', async ({ page }) => {
    await page.goto('/products/field-notes');

    // `isVisible()` is a single read against the DOM right now. It is the
    // right answer only when you genuinely want a snapshot, as here.
    expect(await page.getByRole('button', { name: 'Add to cart' }).isVisible()).toBe(true);
  });
});

test.describe('locators are lazy', () => {
  test('resolves the same locator against a page that has changed underneath it', async ({ page }) => {
    await page.goto('/products/field-notes');
    const status = page.getByRole('status'); // describes how to find, finds nothing yet

    await expect(status).toHaveText('');

    await page.getByRole('button', { name: 'Add to cart' }).click();

    // No stale element reference: the locator is re-resolved on every use.
    await expect(status).toHaveText('1 item in cart');
  });

  test('counts matches without throwing when there are none', async ({ page }) => {
    await page.goto('/products/field-notes');

    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});

test.describe('network interception', () => {
  /* Making a dependency fail on demand, which the real one will not do.
     https://endtoendtester.com/testing-levels/integration-testing-with-stubs */
  test('shows a message when the shipping rate cannot be fetched', async ({ page }) => {
    await page.route('**/api/shipping-rate', (route) => route.fulfill({ status: 503, body: '' }));

    await page.goto('/checkout');

    await expect(page.getByRole('alert')).toHaveText('We cannot calculate shipping right now.');
    await expect(page.getByRole('button', { name: 'Pay' })).toBeDisabled();
  });

  test('can rewrite a response rather than only failing it', async ({ page, request }, testInfo) => {
    const session = newSession(testInfo.workerIndex);
    await page.goto('/');
    await page.evaluate((id) => sessionStorage.setItem('session', id), session);
    await seedCart(request, session, [{ slug: 'field-notes', quantity: 1 }]);

    await page.route('**/api/shipping-rate', (route) =>
      route.fulfill({ json: { standardCents: 0, freeOverCents: 0 } })
    );
    await page.goto('/checkout');

    await expect(page.getByTestId('summary')).toHaveText('1 item(s) — £12.00');
  });

  test('waits on a named request rather than on a duration', async ({ page }) => {
    await page.goto('/products/field-notes');

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/cart') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Add to cart' }).click()
    ]);

    expect(response.status()).toBe(201);
  });
});

test.describe('the request fixture', () => {
  test('talks to the API directly, sharing the browser context cookies', async ({ request }) => {
    const health = await request.get('/api/health');

    expect(health.ok()).toBe(true);
    expect(await health.json()).toEqual({ status: 'ok' });
  });
});
