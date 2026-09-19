#!/usr/bin/env node
/**
 * Writes a README into every sample directory from samples.json, so each
 * one says what it is, which article it belongs to, how to run it, and
 * where its last CI result is.
 *
 * Regenerated rather than hand-maintained: 87 READMEs written by hand
 * would be 87 places for a link to rot.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const { repo, site, samples } = JSON.parse(readFileSync(path.join(ROOT, 'samples.json'), 'utf8'));

/** How to run each workspace, keyed by the first path segment. */
const HOW_TO_RUN = {
  typescript: 'cd typescript && npm ci && npm test',
  browser: 'cd browser && npm ci && npx playwright install --with-deps chromium && npx playwright test',
  vitest: 'cd vitest && npm ci && npx vitest run',
  angular: 'cd angular && npm ci && npx jest',
  'cypress-samples': 'cd browser && npm ci && cd ../cypress-samples && npm ci && npm test',
  selenium: 'cd browser && npm ci && cd ../selenium && npm ci && npm test',
  dotnet: 'cd dotnet && dotnet test Samples.sln',
  java: 'cd java && mvn -B test',
  python: 'cd python && pip install -r requirements.txt && PYTHONPATH=. pytest',
  ruby: 'cd ruby && bundle install && bundle exec rspec',
  cucumber: 'cd cucumber && npm ci && npx cucumber-js',
  flutter: 'cd flutter && flutter pub get && flutter test',
  k6: 'cd browser && npm ci && node app/server.mjs &\ncd k6 && k6 run quality/performance-testing/checkout-latency.js',
  terraform: 'cd terraform && terraform init -backend=false && terraform test',
  pipelines: 'pip install pyyaml && python3 tools/validate_pipelines.py',
  reference: null,
  '.github': null
};

const byRef = new Map();
for (const sample of samples) {
  byRef.set(sample.ref, [...(byRef.get(sample.ref) ?? []), sample]);
}

const title = (ref) =>
  ref
    .split('/')[1]
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

let written = 0;

for (const sample of samples) {
  const dir = path.join(ROOT, sample.path);
  if (!existsSync(dir)) continue;

  const workspace = sample.path.split('/')[0];
  const run = HOW_TO_RUN[workspace];
  const siblings = (byRef.get(sample.ref) ?? []).filter((other) => other.path !== sample.path);
  const notesPath = path.join(dir, 'NOTES.md');
  const notes = existsSync(notesPath) ? readFileSync(notesPath, 'utf8').trim() : null;

  const lines = [
    `# ${title(sample.ref)} — ${sample.language}`,
    '',
    `The runnable sample for **[${title(sample.ref)}](${site}/${sample.ref})**.`,
    ''
  ];

  if (sample.runs) {
    lines.push(
      `[![${sample.workflow}](https://github.com/${repo}/actions/workflows/${sample.workflow}/badge.svg?branch=main)](https://github.com/${repo}/actions/workflows/${sample.workflow}?query=branch%3Amain)`,
      '',
      `Runs on every push. The badge above is live; click it for the last result.`,
      ''
    );
  } else {
    lines.push(
      '> **Not run in CI.** This sample needs hardware or a licensed platform a',
      '> Linux runner does not have. See [reference/README.md](../../README.md)',
      '> for what it needs and what runs instead.',
      ''
    );
  }

  if (run) {
    lines.push('## Running it', '', '```bash', run, '```', '');
  }

  if (siblings.length) {
    lines.push(
      '## The same article, in other languages',
      '',
      ...siblings.map(
        (other) => `- [${other.language}](${'../'.repeat(sample.path.split('/').length)}${other.path})`
      ),
      ''
    );
  }

  if (notes) {
    lines.push('## Notes', '', notes.replace(/^# .*\n+/, ''), '');
  }

  lines.push(
    '---',
    '',
    `Part of [endtoendtester.com](${site}) — a connected reference for test automation.`,
    `Every article's samples are listed at [${site}/samples](${site}/samples).`,
    ''
  );

  writeFileSync(path.join(dir, 'README.md'), lines.join('\n'));
  written += 1;
}

console.log(`\n  wrote ${written} sample READMEs\n`);

/* ---- the root index ------------------------------------------------ */

const WORKFLOWS = [...new Set(samples.filter((s) => s.runs).map((s) => s.workflow))].sort();

const badge = (workflow) =>
  `[![${workflow.replace('.yml', '')}](https://github.com/${repo}/actions/workflows/${workflow}/badge.svg?branch=main)](https://github.com/${repo}/actions/workflows/${workflow}?query=branch%3Amain)`;

const pillars = [...new Set(samples.map((s) => s.ref.split('/')[0]))].sort();

const rows = [];
for (const pillar of pillars) {
  const inPillar = samples.filter((s) => s.ref.split('/')[0] === pillar);
  const refs = [...new Set(inPillar.map((s) => s.ref))].sort();

  rows.push('', `### ${pillar}`, '', '| Article | Sample | Language | CI |', '|---|---|---|---|');
  for (const ref of refs) {
    for (const sample of inPillar.filter((s) => s.ref === ref)) {
      rows.push(
        `| [${title(ref)}](${site}/${ref}) | [\`${sample.path}\`](${sample.path}) | ${sample.language} | ${
          sample.runs ? `[${sample.workflow.replace('.yml', '')}](https://github.com/${repo}/actions/workflows/${sample.workflow}?query=branch%3Amain)` : '— reference only'
        } |`
      );
    }
  }
}

const readme = `# End To End Tester — samples

Every article on **[endtoendtester.com](${site})** has a runnable sample here,
and all but four of them run in CI on every push.

${WORKFLOWS.map(badge).join('\n')}

## What this is

${samples.length} sample directories covering all ${byRef.size} articles, in
TypeScript, C#, Java, Python, Ruby, Dart, Gherkin, HCL and four CI
platforms' own configuration languages.

The directory layout mirrors the site: \`practices/flaky-tests\` on the site
is \`<workspace>/.../practices/flaky-tests\` here, so there is nothing to look
up.

Every sample is a **working test**, not a fragment. Several of them found
real defects while being written — the Java money type was overflowing
silently, the browser coverage sample was double-counting V8's nested
ranges and reporting 123% of a file executed, and the test-naming lint
failed on four of this repository's own test names. Those are all fixed,
and the comments explaining them are the point.

## Running everything

Each workspace is independent:

\`\`\`bash
cd typescript      && npm ci && npm test
cd browser         && npm ci && npx playwright install --with-deps chromium && npx playwright test
cd vitest          && npm ci && npx vitest run
cd angular         && npm ci && npx jest
cd dotnet          && dotnet test Samples.sln
cd java            && mvn -B test
cd python          && pip install -r requirements.txt && PYTHONPATH=. pytest
cd ruby            && bundle install && bundle exec rspec
cd cucumber        && npm ci && npx cucumber-js
cd flutter         && flutter pub get && flutter test
cd terraform       && terraform init -backend=false && terraform test
\`\`\`

Two demonstrations are worth running by hand, because each asserts that it
still demonstrates what it claims:

\`\`\`bash
cd typescript && npm run coverage:metrics   # 100% lines, 83% branches — the gap
cd typescript && npm run mutation           # surviving mutants in 100%-covered code
\`\`\`

## The samples

${rows.join('\n')}

## Reference-only samples

Four need hardware or a licensed platform a Linux runner does not have, so
they are written to be copied rather than stubbed into something that would
pass while proving nothing. See [reference/README.md](reference/README.md) —
two of the four have a runnable counterpart elsewhere in this repository.

## How this is kept honest

- \`tools/build-manifest.mjs\` rebuilds \`samples.json\` and **fails** if a
  sample points at an article that does not exist. It also reports any
  article with no sample.
- \`tools/generate-readmes.mjs\` writes all ${samples.length} sample READMEs
  from that manifest, so no link is maintained by hand.
- \`tools/validate_pipelines.py\` parses the four CI platform configs and
  asserts each still carries the property its article is about.
- \`typescript/src/practices/test-naming\` lints every test name in the
  TypeScript workspace, and \`roles/quality-ownership\` fails the build for a
  module with no test beside it and no written reason why.

---

Part of [endtoendtester.com](${site}).
`;

writeFileSync(path.join(ROOT, 'README.md'), readme);
console.log(`  wrote the root README (${rows.length} table rows)\n`);
