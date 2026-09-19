import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

/* One config for the build and the tests. The alias below is defined once
   and used by both — in a Jest setup the same information lives in
   moduleNameMapper and drifts. https://endtoendtester.com/tools/vitest */
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': resolve(import.meta.dirname, './src') } },
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Without this, tests written inside a source file are never collected
    // and quietly prove nothing.
    includeSource: ['src/**/*.ts'],
    environmentMatchGlobs: [
      ['src/web-frameworks/**', 'jsdom'],
      ['**', 'node']
    ],
    coverage: { provider: 'v8', reporter: ['text-summary'] }
  },
  define: {
    // In-source tests are stripped from a production build by this.
    'import.meta.vitest': 'undefined'
  }
});
