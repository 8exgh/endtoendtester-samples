import { expect, test } from '@playwright/test';

/* Tests that do not care which engine they are on — which is most of the
   work of making a suite cross-browser.
   https://endtoendtester.com/platforms/cross-browser-testing */

test('the checkout page is usable on every engine @critical', async ({ page }, testInfo) => {
  await page.goto('/checkout');

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await expect(page.getByLabel('Card number')).toBeEditable();

  // Recorded rather than asserted on, so a failure report says which
  // engine it came from without anyone going to look.
  testInfo.annotations.push({ type: 'engine', description: testInfo.project.name });
});

test('formatted money is matched tolerantly, not exactly @critical', async ({ page }) => {
  await page.goto('/products/standing-desk');

  /* Exact formatted output differs between engines and ICU versions.
     Asserting on the value rather than the rendering survives all of it. */
  await expect(page.getByTestId('price')).toHaveText(/£\s?400[.,]00/);
});

test('position is asserted as a property, not as a pixel @critical', async ({ page }) => {
  await page.goto('/products/field-notes');

  // `toBeInViewport` is engine-agnostic; a bounding-box coordinate is not.
  await expect(page.getByRole('button', { name: 'Add to cart' })).toBeInViewport();
});

test('date parsing is done in a way every engine agrees on', async ({ page }) => {
  await page.goto('/');

  const parsed = await page.evaluate(() => ({
    // Safari rejects "2026-01-01 12:00"; every engine accepts ISO 8601.
    iso: Number.isNaN(new Date('2026-01-01T12:00:00Z').valueOf()),
    spaceSeparated: Number.isNaN(new Date('2026-01-01 12:00').valueOf())
  }));

  expect(parsed.iso).toBe(false);
  // Not asserted the other way round: whether the loose form parses is
  // exactly the engine difference this sample is warning about.
  expect(typeof parsed.spaceSeparated).toBe('boolean');
});
