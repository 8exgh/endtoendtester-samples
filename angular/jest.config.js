/* jest-preset-angular compiles the templates and wires zone.js, which is
   the whole reason Angular needs its own runner configuration.
   https://endtoendtester.com/web-frameworks/angular-testing */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': ['jest-preset-angular', { tsconfig: '<rootDir>/tsconfig.json' }]
  }
};
