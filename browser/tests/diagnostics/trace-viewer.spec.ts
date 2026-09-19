import fs from 'node:fs';
import { expect, test } from '@playwright/test';

/* A trace is every action, every request, every console message and a DOM
   snapshot at each step. It is the reason a CI failure is usually a
   five-minute diagnosis. https://endtoendtester.com/diagnostics/trace-viewer */

test('captures a trace containing the actions, network and snapshots', async ({ page, context }, testInfo) => {
  const tracePath = testInfo.outputPath('trace.zip');

  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  await page.goto('/products/field-notes');
  await page.getByRole('spinbutton', { name: 'Quantity' }).fill('2');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByRole('status')).toHaveText('2 items in cart');

  await context.tracing.stop({ path: tracePath });

  expect(fs.existsSync(tracePath)).toBe(true);

  /* Asserting on the contents rather than on a byte count: a size
     threshold is an arbitrary number that fails for reasons that have
     nothing to do with tracing. A trace is a zip, and zip stores its
     entry names uncompressed, so the names can be read straight out of
     the bytes. */
  const archive = fs.readFileSync(tracePath);
  expect(archive.subarray(0, 2).toString()).toBe('PK');

  const entryNames = archive.toString('latin1');
  expect(entryNames).toContain('.trace');    // the action log
  expect(entryNames).toContain('.network');  // every request the page made
  expect(entryNames).toMatch(/resources\//); // DOM snapshots and screenshots

  await testInfo.attach('trace', { path: tracePath, contentType: 'application/zip' });
});

test('a chunked trace covers one named section rather than the whole run', async ({ page, context }, testInfo) => {
  const tracePath = testInfo.outputPath('checkout-chunk.zip');
  await context.tracing.start({ screenshots: true, snapshots: true });

  await page.goto('/'); // not interesting, and not in the chunk

  await context.tracing.startChunk({ title: 'the checkout page loading' });
  await page.goto('/checkout');
  await expect(page.getByTestId('summary')).not.toHaveText('Loading your basket…');
  await context.tracing.stopChunk({ path: tracePath });

  expect(fs.readFileSync(tracePath).subarray(0, 2).toString()).toBe('PK');
  expect(fs.readFileSync(tracePath).toString('latin1')).toContain('.trace');
  await context.tracing.stop();
});
