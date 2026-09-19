const { defineConfig } = require('cypress');

/* https://endtoendtester.com/tools/cypress */
module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:4321',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    // One retry in CI, none while developing — the same policy as the
    // Playwright suite, for the same reason.
    retries: { runMode: 1, openMode: 0 },
    // Video is large and mostly redundant with the command log's DOM
    // snapshots, which are Cypress's real diagnostic.
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720
  }
});
