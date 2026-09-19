import { expect, test } from '@playwright/test';

/* Two different activities that share one mechanism: capturing a failure,
   and comparing against an approved appearance.
   https://endtoendtester.com/diagnostics/screenshots */

test.describe('diagnostic capture', () => {
  test('produces a screenshot and the page HTML for a failure report', async ({ page }, testInfo) => {
    await page.goto('/checkout');

    const shot = await page.screenshot({ fullPage: true });
    await testInfo.attach('checkout', { body: shot, contentType: 'image/png' });
    // The HTML is the half people forget: the picture shows what it looked
    // like, the markup shows why.
    await testInfo.attach('dom', { body: await page.content(), contentType: 'text/html' });

    expect(shot.byteLength).toBeGreaterThan(1_000);
  });
});

test.describe('masking, which is what makes visual comparison usable', () => {
  /* No committed baseline: both images are taken in this run, on this
     machine, so there is no font-rendering difference to fight. What is
     being demonstrated is the effect of a mask, and that is the part
     people get wrong. */
  test('an unmasked shot changes when a dynamic region changes', async ({ page }) => {
    await page.goto('/products/field-notes');
    const before = await page.screenshot();

    await page.getByTestId('price').evaluate((el) => (el.textContent = '£99.99'));
    const after = await page.screenshot();

    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test('a masked shot ignores exactly that region', async ({ page }) => {
    await page.goto('/products/field-notes');
    const mask = [page.getByTestId('price')];

    const before = await page.screenshot({ mask });
    await page.getByTestId('price').evaluate((el) => (el.textContent = '£99.99'));
    const after = await page.screenshot({ mask });

    expect(Buffer.compare(before, after)).toBe(0);
  });

  test('disabling animations removes the other source of visual flakiness', async ({ page }) => {
    await page.goto('/checkout');

    const first = await page.screenshot({ animations: 'disabled' });
    const second = await page.screenshot({ animations: 'disabled' });

    expect(Buffer.compare(first, second)).toBe(0);
  });
});
