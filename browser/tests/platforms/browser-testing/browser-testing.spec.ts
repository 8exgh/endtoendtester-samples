import { expect, test } from '@playwright/test';

/* What only a real browser can tell you.
   https://endtoendtester.com/platforms/browser-testing */

test.describe('failing on things most suites ignore', () => {
  /* An uncaught exception that does not break the assertion still usually
     means something is broken. Failing on it costs nothing. */
  test('the product page raises no page errors or console errors', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
    });

    await page.goto('/products/field-notes');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByRole('status')).toHaveText('1 item in cart');

    expect(problems).toEqual([]);
  });
});

test.describe('layout, which no jsdom test can answer', () => {
  test('keeps the pay button on screen at a phone width', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });

    await page.goto('/checkout');

    await expect(page.getByRole('button', { name: 'Pay' })).toBeInViewport();
  });

  test('reports real measurements rather than zeroes', async ({ page }) => {
    await page.goto('/products/field-notes');

    const box = await page.getByRole('button', { name: 'Add to cart' }).boundingBox();

    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('applies real CSS, so an invisible control is detectable', async ({ page }) => {
    await page.goto('/products/field-notes');
    await page.addStyleTag({ content: '#add { visibility: hidden }' });

    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeHidden();
  });
});

test.describe('the network', () => {
  /* Third-party scripts are slow, outside your control, and a recurring
     source of flakiness that has nothing to do with your application. */
  test('can be told to drop third-party requests entirely', async ({ page }) => {
    const blocked: string[] = [];
    await page.route(/analytics|doubleclick|hotjar/, (route) => {
      blocked.push(route.request().url());
      return route.abort();
    });

    await page.goto('/');
    await page.evaluate(() => fetch('https://analytics.example.com/collect').catch(() => {}));

    await expect.poll(() => blocked.length).toBeGreaterThan(0);
  });

  test('records every request the page actually made', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (request) => urls.push(request.url()));

    await page.goto('/checkout');
    await expect(page.getByTestId('summary')).not.toHaveText('Loading your basket…');

    expect(urls.some((url) => url.includes('/api/shipping-rate'))).toBe(true);
  });
});
