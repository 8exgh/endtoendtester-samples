#!/usr/bin/env node
/**
 * The demonstration behind https://endtoendtester.com/coverage/mutation-testing
 *
 * Two modules, two stories:
 *   money.ts     exhaustively tested  -> a high mutation score
 *   shipping.ts  100% line coverage,  -> surviving mutants, because
 *                two tests               coverage records execution and
 *                                        mutation testing records whether
 *                                        anybody was watching.
 *
 * Fails if either story stops being true.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const report = path.resolve(import.meta.dirname, '../typescript/reports/mutation/mutation.json');
const { files } = JSON.parse(readFileSync(report, 'utf8'));

function scoreFor(suffix) {
  const entry = Object.entries(files).find(([name]) => name.endsWith(suffix));
  if (!entry) throw new Error(`no mutation results for ${suffix}`);

  const mutants = entry[1].mutants;
  const killed = mutants.filter((m) => m.status === 'Killed').length;
  const survived = mutants.filter((m) => m.status === 'Survived').length;
  const covered = killed + survived + mutants.filter((m) => m.status === 'Timeout').length;

  return {
    killed,
    survived,
    total: mutants.length,
    score: covered === 0 ? 0 : Math.round(((killed + mutants.filter((m) => m.status === 'Timeout').length) / covered) * 100),
    survivors: mutants.filter((m) => m.status === 'Survived').map((m) => `${m.mutatorName} at line ${m.location.start.line}`)
  };
}

const money = scoreFor('money.ts');
const shipping = scoreFor('shipping.ts');

console.log(`\n  money.ts     ${money.score}%  (${money.killed} killed, ${money.survived} survived of ${money.total})`);
console.log(`  shipping.ts  ${shipping.score}%  (${shipping.killed} killed, ${shipping.survived} survived of ${shipping.total})`);
if (shipping.survivors.length) {
  console.log('\n  surviving mutants in shipping.ts — each one is a missing test:');
  for (const survivor of shipping.survivors) console.log(`    ${survivor}`);
}

const problems = [];
if (money.score < 85) {
  problems.push(`money.ts scored ${money.score}%, expected at least 85% — the money tests have weakened`);
}
if (shipping.survived === 0) {
  problems.push('shipping.ts has no surviving mutants — the demonstration no longer demonstrates');
}

console.log();
if (problems.length) {
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}
console.log('  ✓ Exhaustive tests kill their mutants. 100%-covered, barely-asserted code does not.');
