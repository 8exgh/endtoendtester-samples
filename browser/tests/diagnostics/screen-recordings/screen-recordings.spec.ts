import fs from 'node:fs';
import { expect, test } from '@playwright/test';

/* Video costs storage and is rarely watched, so it is configured to cost
   nothing on a green run. This proves the machinery works.
   https://endtoendtester.com/diagnostics/screen-recordings */

test('records a video of a context and finalises it on close', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    recordVideo: { dir: testInfo.outputPath('videos'), size: { width: 640, height: 480 } }
  });
  const page = await context.newPage();

  await page.goto('/products/field-notes');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByRole('status')).toHaveText('1 item in cart');

  const video = page.video();
  expect(video).not.toBeNull();

  /* The file is finalised when the context closes. Killing the process
     instead is why people report videos missing their last few seconds. */
  await context.close();

  const videoPath = await video!.path();
  expect(fs.existsSync(videoPath)).toBe(true);
  expect(fs.statSync(videoPath).size).toBeGreaterThan(1_000);

  await testInfo.attach('journey', { path: videoPath, contentType: 'video/webm' });
});
