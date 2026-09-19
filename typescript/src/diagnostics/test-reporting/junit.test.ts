import fs from 'node:fs';
import path from 'node:path';

/* The report is the product of a test run, and it is worth asserting on:
   a JUnit file with no file attribute means CI can tell you a test failed
   but not where. https://endtoendtester.com/diagnostics/test-reporting */

const REPORT = path.resolve(__dirname, '../../../reports/junit.xml');

/* Parsed with a regex rather than an XML library on purpose: the assertions
   are about attributes being present at all, and a dependency for that
   would be more machinery than the thing it checks. */
function attributesOf(xml: string, tag: string): Record<string, string>[] {
  return [...xml.matchAll(new RegExp(`<${tag}\\s([^>]*?)/?>`, 'g'))].map((match) =>
    Object.fromEntries(
      [...match[1].matchAll(/([\w:.-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value])
    )
  );
}

const describeIfReported = fs.existsSync(REPORT) ? describe : describe.skip;

describeIfReported('the JUnit report this suite produces', () => {
  const xml = fs.existsSync(REPORT) ? fs.readFileSync(REPORT, 'utf8') : '';

  it('records every suite with a name and a duration', () => {
    const suites = attributesOf(xml, 'testsuite');

    expect(suites.length).toBeGreaterThan(0);
    for (const suite of suites) {
      expect(suite.name).toBeTruthy();
      expect(Number(suite.time)).not.toBeNaN();
    }
  });

  /* Without a file attribute, a CI platform can tell you a test failed but
     not which line to annotate — which is the difference between a failure
     fixed in ten minutes and one fixed tomorrow. */
  it('carries a file attribute so CI can annotate the right line', () => {
    const cases = attributesOf(xml, 'testcase');

    expect(cases.length).toBeGreaterThan(0);
    expect(cases.filter((testCase) => !testCase.file)).toEqual([]);
  });

  it('names each case well enough to read without opening the file', () => {
    const cases = attributesOf(xml, 'testcase');

    const vague = cases.filter((testCase) => (testCase.name ?? '').trim().split(/\s+/).length < 4);
    expect(vague).toEqual([]);
  });
});

describe('detecting a test that only passed on retry', () => {
  /* Most runners report a retried-then-passed test as a pass, which is how
     flakiness becomes invisible. This is the check a pipeline should make
     against a runner that does distinguish them. */
  const results = {
    suites: [
      { specs: [{ tests: [{ status: 'passed' }] }, { specs: [] as unknown[], tests: [] as unknown[] }] },
      { specs: [{ tests: [{ status: 'flaky' }] }] }
    ]
  };

  function flakyCount(report: typeof results): number {
    return report.suites
      .flatMap((suite) => suite.specs ?? [])
      .flatMap((spec) => (spec as { tests?: { status: string }[] }).tests ?? [])
      .filter((test) => test.status === 'flaky').length;
  }

  it('counts a flaky outcome rather than folding it into the passes', () => {
    expect(flakyCount(results)).toBe(1);
  });

  it('reports zero when every test passed first time', () => {
    expect(flakyCount({ suites: [{ specs: [{ tests: [{ status: 'passed' }] }] }] })).toBe(0);
  });
});
