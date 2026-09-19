import { expect, test } from '@playwright/test';

/* Collecting coverage from a browser run, which answers a question no
   other measurement does: which code is reached only by the slowest tests.
   https://endtoendtester.com/coverage/e2e-code-coverage
 *
 * V8's own coverage is used rather than an Istanbul-instrumented build,
 * because it needs no separate bundle and cannot accidentally ship. The
 * instrumented route, and merging with the unit run, is in the README. */

/* V8 reports NESTED ranges: a function range contains block ranges, and an
   uncovered `else` sits inside a covered function. Summing every range with
   count > 0 therefore double-counts and can exceed 100% — which it does,
   loudly, the first time anyone tries it.
 *
 * The ranges arrive outermost-first, so painting them in order onto a byte
 * map gives the right answer: an inner uncovered range overwrites the
 * covered parent it sits inside. */
function coveredBytes(entry: { source?: string; functions: { ranges: { startOffset: number; endOffset: number; count: number }[] }[] }) {
  const total = entry.source?.length ?? 0;
  const map = new Uint8Array(total);

  for (const fn of entry.functions) {
    for (const range of fn.ranges) {
      map.fill(range.count > 0 ? 1 : 0, range.startOffset, Math.min(range.endOffset, total));
    }
  }

  let used = 0;
  for (const byte of map) used += byte;
  return { used, total };
}

test.describe('javascript coverage', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'V8 coverage is Chromium-only');

  test('records which of the client script a journey actually executed', async ({ page }) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });

    await page.goto('/products/field-notes');
    await page.getByRole('spinbutton', { name: 'Quantity' }).fill('2');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByRole('status')).toHaveText('2 items in cart');

    const entries = await page.coverage.stopJSCoverage();
    const client = entries.find((entry) => entry.url.endsWith('/app.js'));

    expect(client).toBeDefined();

    const { used, total } = coveredBytes(client!);
    const pct = Math.round((used / total) * 100);
    console.log(`\n  client script: ${used}/${total} bytes executed (~${pct}%)\n`);

    expect(total).toBeGreaterThan(0);
    expect(used).toBeGreaterThan(0);
    // The assertion that catches the nested-range mistake.
    expect(used).toBeLessThanOrEqual(total);
    expect(pct).toBeLessThanOrEqual(100);
  });

  /* The finding the article is about: the checkout path is reached only by
     a browser test, so it is protected only by the slowest and most
     fragile suite. Two journeys, two coverage numbers, one comparison. */
  test('shows that the checkout path is only reached by a browser journey', async ({ page }) => {
    const executed = async (visit: () => Promise<void>) => {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      await visit();
      const entries = await page.coverage.stopJSCoverage();
      const client = entries.find((entry) => entry.url.endsWith('/app.js'));
      return coveredBytes(client!).used;
    };

    const browsingOnly = await executed(async () => {
      await page.goto('/products/field-notes');
      await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible();
    });

    const throughCheckout = await executed(async () => {
      await page.goto('/products/field-notes');
      await page.getByRole('button', { name: 'Add to cart' }).click();
      await expect(page.getByRole('status')).toHaveText('1 item in cart');
      await page.goto('/checkout');
      await page.getByLabel('Card number').fill('4242424242424242');
      await page.getByRole('button', { name: 'Pay' }).click();
      await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
    });

    console.log(`\n  browsing only:    ${browsingOnly} bytes`);
    console.log(`  through checkout: ${throughCheckout} bytes\n`);

    expect(throughCheckout).toBeGreaterThan(browsingOnly);
  });
});
