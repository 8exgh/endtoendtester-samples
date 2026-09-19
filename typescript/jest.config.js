/* One workspace, three projects, because the samples need three different
   environments and running the fast ones in the slow one is a tax paid on
   every run:
 *
 *   node    pure logic, HTTP, doubles — most of the repository
 *   dom     anything that renders (jsdom)
 *   docker  the samples that start a real container
 *
 * `npm test` runs everything; CI splits them across jobs so a Docker
 * failure cannot look like a unit-test failure.
 */
const transform = {
  // SWC, not ts-jest: type checking belongs in `tsc --noEmit`, not in the
  // hot path of every test run. See /tools/jest.
  '^.+\\.(t|j)sx?$': [
    '@swc/jest',
    {
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        transform: { react: { runtime: 'automatic' } },
        target: 'es2022'
      }
    }
  ]
};

/* The samples that start a real container. Listed as path fragments
   because `testMatch` wants globs and `testPathIgnorePatterns` wants
   regular expressions, and one list feeding both is easier to keep
   honest than two. */
const DOCKER_DIRS = [
  'src/testing-levels/integration-testing',
  'src/tools/testcontainers',
  'src/quality/database-testing'
];

const dockerGlobs = DOCKER_DIRS.map((dir) => `<rootDir>/${dir}/**/*.test.ts`);
const dockerPatterns = DOCKER_DIRS.map((dir) => `/${dir}/`);

module.exports = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      transform,
      testMatch: ['<rootDir>/src/**/*.test.ts'],
      // `.dom.test.ts` is the escape hatch for a DOM test with no JSX in
      // it — a Knockout binding, a web component, a jQuery plugin.
      testPathIgnorePatterns: ['/node_modules/', '\\.dom\\.test\\.ts$', ...dockerPatterns]
    },
    {
      displayName: 'dom',
      testEnvironment: 'jsdom',
      transform,
      testMatch: ['<rootDir>/src/**/*.test.tsx', '<rootDir>/src/**/*.dom.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
    },
    {
      displayName: 'docker',
      testEnvironment: 'node',
      transform,
      testMatch: dockerGlobs,
      // Pulling and starting Postgres is slower than any assertion in here.
      testTimeout: 120_000
    }
  ],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}'],
  coverageReporters: ['text-summary', 'lcov'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports', outputName: 'junit.xml', addFileAttribute: 'true' }]
  ]
};
