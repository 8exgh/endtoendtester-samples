import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import '@testing-library/jest-dom';

/* The current entry point. `jest-preset-angular/setup-jest` still works
   and prints a deprecation notice on every run, which is the kind of noise
   that trains people to ignore test output.
   https://endtoendtester.com/web-frameworks/angular-testing */
setupZoneTestEnv();
