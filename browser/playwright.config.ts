import { defineConfig, devices } from '@playwright/test';

/* The configuration the articles describe, in one place.
   https://endtoendtester.com/tools/playwright */

const PORT = Number(process.env.PORT ?? 4321);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // A stray `.only` must fail the build rather than quietly running one test.
  forbidOnly: !!process.env.CI,
  // One retry, reported as "flaky" rather than folded into the passes.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI
    ? [['blob'], ['github'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // The single best setting here: nothing on a green run, and a CI
    // failure becomes a five-minute diagnosis.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },

    /* Everything runs on the engine most users have; the journeys that
       would end the business run on the others too. Running the full suite
       three times triples the cost and the flakiness for a small marginal
       signal. https://endtoendtester.com/platforms/cross-browser-testing */
    { name: 'webkit-critical', use: { ...devices['Desktop Safari'] }, grep: /@critical/ },
    { name: 'firefox-critical', use: { ...devices['Desktop Firefox'] }, grep: /@critical/ },
    { name: 'mobile-safari-critical', use: { ...devices['iPhone 15'] }, grep: /@critical/ }
  ],

  // Starts the app and waits for it to answer — no sleep in a CI script.
  webServer: {
    command: 'node app/server.mjs',
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
