import path from 'node:path';
import { audit, auditFile } from './testability-audit';

/* https://endtoendtester.com/roles/sdet-vs-automation-tester-vs-manual-qa */

describe('the audit itself', () => {
  it('flags a module that reads the wall clock directly', () => {
    const findings = auditFile('billing.ts', 'export const due = (at: number) => at < Date.now();');

    expect(findings).toEqual([{ module: 'billing.ts', edge: 'the wall clock', line: 1 }]);
  });

  it('flags a module that reaches for the environment at the point of use', () => {
    const findings = auditFile('config.ts', 'export const region = () => process.env.AWS_REGION;');

    expect(findings.map((f) => f.edge)).toEqual(['the environment']);
  });

  /* The distinction that makes the audit useful rather than noisy: a line
     that names the seam IS the seam. */
  it('does not flag a module that takes the clock as a dependency', () => {
    const findings = auditFile(
      'billing.ts',
      'export const due = (at: number, clock: Clock) => at < clock();'
    );

    expect(findings).toEqual([]);
  });

  /* The refinement that keeps the audit honest: a default parameter
     supplying the real implementation is the seam, not a breach of it. */
  it('does not flag a default parameter that callers can replace', () => {
    const findings = auditFile('carts.ts', 'export async function expire(store: Store, now = Date.now()) {');

    expect(findings).toEqual([]);
  });

  it('still flags the same call made in the middle of a function body', () => {
    const findings = auditFile('carts.ts', ['function expire() {', '  const at = Date.now();', '}'].join('\n'));

    expect(findings).toHaveLength(1);
  });

  it('reports the line, so the finding is actionable rather than a score', () => {
    const findings = auditFile('a.ts', ['const x = 1;', 'const id = Math.random();'].join('\n'));

    expect(findings[0]).toMatchObject({ edge: 'randomness', line: 2 });
  });
});

describe('the audit run against this repository', () => {
  const SRC = path.resolve(__dirname, '../..');

  /* Deliberately not asserted to be empty. These samples exist to show what
     an untestable edge looks like, and pretending otherwise would make the
     tool a liar. What is asserted is that the number is known — an audit
     whose result nobody has looked at is not an audit. */
  const EXPECTED_HARD_EDGES = new Set([
    '_app/app.ts',
    'practices/dependency-injection/tokens.ts',
    'practices/parallel-test-execution/shared-resources.ts',
    'practices/test-data-management/builders.ts',
    'practices/flaky-tests/async-work.ts',
    'roles/sdet-vs-automation-tester-vs-manual-qa/testability-audit.ts',
    'roles/shift-left-testing/fast-check.ts',
    'tools/jest/retry.ts',
    'testing-levels/integration-testing-with-stubs/rates-client.ts',
    'testing-levels/integration-testing-with-stubs/stub-server.ts',
    'testing-levels/test-doubles/doubles.ts',
    'web-frameworks/snapshot-testing/invoice.ts'
  ]);

  it('finds no hard edge in a module nobody has accounted for', () => {
    const findings = audit(SRC);
    const surprises = [...new Set(findings.map((f) => f.module))].filter(
      (module) => !EXPECTED_HARD_EDGES.has(module)
    );

    expect(surprises).toEqual([]);
  });

  it('produces findings that name a module, an edge and a line', () => {
    for (const finding of audit(SRC)) {
      expect(finding.module).toMatch(/\.tsx?$/);
      expect(finding.edge.length).toBeGreaterThan(3);
      expect(finding.line).toBeGreaterThan(0);
    }
  });
});
