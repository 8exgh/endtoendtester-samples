#!/usr/bin/env node
/**
 * The demonstration behind https://endtoendtester.com/coverage/coverage-metrics
 *
 * Runs Jest with coverage over one deliberately under-tested module and
 * asserts the thing the article claims: line coverage says 100% while two
 * branches have only ever been taken one way.
 *
 * It fails if the gap closes, which makes it a test of the demonstration
 * rather than a script that prints a number nobody reads.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const workspace = path.resolve(import.meta.dirname, '../typescript');
const summaryPath = path.join(workspace, 'coverage/coverage-summary.json');

execFileSync(
  'npx',
  [
    'jest',
    '--selectProjects', 'node',
    '--coverage',
    '--coverageReporters=json-summary',
    '--coverageReporters=text',
    '--collectCoverageFrom=src/coverage/coverage-metrics/shipping.ts',
    'src/coverage/coverage-metrics'
  ],
  { cwd: workspace, stdio: 'inherit' }
);

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const file = Object.entries(summary).find(([key]) => key.endsWith('shipping.ts'));

if (!file) {
  console.error('No coverage recorded for shipping.ts — did the path change?');
  process.exit(1);
}

const [, metrics] = file;
const lines = metrics.lines.pct;
const branches = metrics.branches.pct;

console.log(`\n  lines    ${lines}%`);
console.log(`  branches ${branches}%\n`);

const problems = [];
if (lines !== 100) {
  problems.push(`expected 100% line coverage, got ${lines}% — the demonstration no longer demonstrates`);
}
if (branches >= 100) {
  problems.push(`expected branch coverage below 100%, got ${branches}% — the gap has been closed`);
}

if (problems.length) {
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}

console.log('  ✓ 100% of lines, and not 100% of branches: the gap the article is about.');
