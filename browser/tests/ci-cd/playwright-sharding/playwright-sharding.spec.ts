import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/* Sharding is a property of the configuration and of whether the suite is
   safe to run concurrently — so both are asserted here, and the workflow
   that actually shards it is .github/workflows/browser.yml.
   https://endtoendtester.com/ci-cd/playwright-sharding */

const CONFIG = fs.readFileSync(path.resolve(__dirname, '../../../playwright.config.ts'), 'utf8');
const TEST_DIR = path.resolve(__dirname, '../..');

function specFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) specFiles(full, found);
    else if (entry.name.endsWith('.spec.ts')) found.push(full);
  }
  return found;
}

test.describe('the configuration a shardable suite needs', () => {
  test('runs tests within a file in parallel, not only across files', () => {
    expect(CONFIG).toMatch(/fullyParallel:\s*true/);
  });

  test('uses the blob reporter in CI, which is what merge-reports needs', () => {
    expect(CONFIG).toMatch(/\['blob'\]/);
  });

  test('refuses a stray .only rather than silently running one test', () => {
    expect(CONFIG).toMatch(/forbidOnly:\s*!!process\.env\.CI/);
  });

  test('reports a retried pass as flaky rather than folding it into the passes', () => {
    expect(CONFIG).toMatch(/retries:\s*process\.env\.CI\s*\?\s*1\s*:\s*0/);
  });
});

test.describe('the suite is actually safe to split', () => {
  /* Sharding multiplies concurrency, so anything marginally unsafe becomes
     reliably broken. A hardcoded port is the classic example. */
  test('no spec binds a fixed port', () => {
    const offenders = specFiles(TEST_DIR).filter((file) =>
      /listen\(\s*[1-9]\d{3}/.test(fs.readFileSync(file, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });

  test('every spec that seeds data derives it from the worker index', () => {
    const offenders = specFiles(TEST_DIR)
      .map((file) => [file, fs.readFileSync(file, 'utf8')] as const)
      .filter(([, source]) => source.includes('seedCart('))
      .filter(([, source]) => !source.includes('newSession('));

    expect(offenders.map(([file]) => path.basename(file))).toEqual([]);
  });

  test('reports which shard it ran in, so an uneven split is visible', ({}, testInfo) => {
    const shard = testInfo.config.shard;
    const where = shard ? `${shard.current}/${shard.total}` : 'unsharded';
    testInfo.annotations.push({ type: 'shard', description: where });

    expect(typeof where).toBe('string');
  });
});
