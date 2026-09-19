#!/usr/bin/env node
/**
 * Builds samples.json by scanning the repository, then checks it against
 * the article list on the site.
 *
 * The manifest is what the site reads to render its "Runnable samples"
 * blocks, so a path in here that does not exist is a broken link on a
 * published page — and an article with no entry is a gap this script is
 * meant to make impossible to ignore.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const REPO = '8exgh/endtoendtester-samples';
const SITE = 'https://endtoendtester.com';

/** Roots whose immediate structure is `<pillar>/<slug>/`. */
const SCANNED = [
  { root: 'typescript/src', workflow: 'typescript.yml', language: 'TypeScript' },
  { root: 'browser/tests', workflow: 'browser.yml', language: 'TypeScript (Playwright)' },
  { root: 'vitest/src', workflow: 'browser-tools.yml', language: 'TypeScript (Vitest)' },
  { root: 'angular/src', workflow: 'flutter-angular-pipelines.yml', language: 'TypeScript (Angular)' },
  { root: 'cypress-samples/cypress/e2e', workflow: 'browser-tools.yml', language: 'JavaScript (Cypress)' },
  { root: 'selenium/tests', workflow: 'browser-tools.yml', language: 'JavaScript (Selenium)' },
  { root: 'python/tests', workflow: 'other-languages.yml', language: 'Python' },
  { root: 'ruby/spec', workflow: 'other-languages.yml', language: 'Ruby' },
  { root: 'flutter/test', workflow: 'flutter-angular-pipelines.yml', language: 'Dart' },
  { root: 'k6', workflow: 'quality-and-infra.yml', language: 'JavaScript (k6)' },
  { root: 'pipelines', workflow: 'flutter-angular-pipelines.yml', language: 'YAML / Groovy / Kotlin' },
  { root: 'reference', workflow: null, language: 'reference only' }
];

/** Samples whose directory layout is dictated by a toolchain rather than
    by the article path, so they are named here instead of scanned. */
const EXPLICIT = [
  { ref: 'tools/xunit', path: 'dotnet/Tests.XUnit/tools/xunit', workflow: 'dotnet.yml', language: 'C#' },
  { ref: 'tools/moq', path: 'dotnet/Tests.XUnit/tools/moq', workflow: 'dotnet.yml', language: 'C#' },
  { ref: 'tools/mocking-frameworks', path: 'dotnet/Tests.XUnit/tools/mocking-frameworks', workflow: 'dotnet.yml', language: 'C# (NSubstitute)' },
  { ref: 'languages/csharp', path: 'dotnet/Tests.XUnit/languages/csharp', workflow: 'dotnet.yml', language: 'C#' },
  { ref: 'practices/dependency-injection', path: 'dotnet/Tests.XUnit/practices/dependency-injection', workflow: 'dotnet.yml', language: 'C# (TimeProvider)' },
  { ref: 'tools/nunit', path: 'dotnet/Tests.NUnit/tools/nunit', workflow: 'dotnet.yml', language: 'C#' },
  { ref: 'tools/mstest', path: 'dotnet/Tests.MSTest/tools/mstest', workflow: 'dotnet.yml', language: 'C#' },
  { ref: 'testing-levels/component-testing', path: 'dotnet/Tests.Component/testing-levels/component-testing', workflow: 'dotnet.yml', language: 'C# (WebApplicationFactory)' },
  { ref: 'platforms/avalonia-testing', path: 'dotnet/Tests.Avalonia/platforms/avalonia-testing', workflow: 'dotnet.yml', language: 'C# (Avalonia headless)' },

  { ref: 'tools/junit', path: 'java/src/test/java/tools/junit', workflow: 'java.yml', language: 'Java' },
  { ref: 'tools/wiremock', path: 'java/src/test/java/tools/wiremock', workflow: 'java.yml', language: 'Java' },
  { ref: 'languages/java', path: 'java/src/test/java/languages/java', workflow: 'java.yml', language: 'Java' },
  { ref: 'testing-levels/contract-testing', path: 'java/src/test/java/testinglevels/contracttesting', workflow: 'java.yml', language: 'Java' },

  { ref: 'practices/given-when-then', path: 'cucumber/features', workflow: 'other-languages.yml', language: 'Gherkin' },
  { ref: 'practices/behavior-driven-development', path: 'cucumber/features', workflow: 'other-languages.yml', language: 'Gherkin' },

  { ref: 'coverage/mutation-testing', path: 'typescript/src/coverage/mutation-testing', workflow: 'quality-and-infra.yml', language: 'TypeScript (Stryker)' },
  { ref: 'ci-cd/terraform-test-infrastructure', path: 'terraform', workflow: 'quality-and-infra.yml', language: 'HCL' },
  { ref: 'ci-cd/github-actions', path: '.github/workflows', workflow: 'typescript.yml', language: 'YAML' },
  { ref: 'ci-cd/playwright-sharding', path: 'browser/tests/ci-cd/playwright-sharding', workflow: 'browser.yml', language: 'TypeScript (Playwright)' }
];

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();

const samples = [];
const seen = new Set();

function add(entry) {
  const key = `${entry.ref}|${entry.path}`;
  if (seen.has(key)) return;
  seen.add(key);
  samples.push(entry);
}

for (const { root, workflow, language } of SCANNED) {
  const base = path.join(ROOT, root);
  if (!isDir(base)) continue;

  for (const pillar of readdirSync(base)) {
    const pillarPath = path.join(base, pillar);
    if (!isDir(pillarPath) || pillar.startsWith('_') || pillar.startsWith('.')) continue;

    for (const slug of readdirSync(pillarPath)) {
      const slugPath = path.join(pillarPath, slug);
      if (!isDir(slugPath)) continue;

      add({
        ref: `${pillar}/${slug}`,
        path: path.relative(ROOT, slugPath),
        workflow,
        language,
        runs: workflow !== null
      });
    }
  }
}

for (const entry of EXPLICIT) {
  if (!isDir(path.join(ROOT, entry.path))) {
    console.error(`  ✗ ${entry.path} does not exist (declared for ${entry.ref})`);
    process.exitCode = 1;
    continue;
  }
  add({ ...entry, runs: entry.workflow !== null });
}

samples.sort((a, b) => a.ref.localeCompare(b.ref) || a.path.localeCompare(b.path));

writeFileSync(
  path.join(ROOT, 'samples.json'),
  `${JSON.stringify(
    {
      $comment:
        'Generated by tools/build-manifest.mjs. The map between an article on endtoendtester.com and the runnable sample(s) for it — the site reads this, so a path here that does not exist is a broken link on a published page.',
      repo: REPO,
      site: SITE,
      generated: new Date().toISOString().slice(0, 10),
      samples
    },
    null,
    2
  )}\n`
);

/* ---- coverage against the site ------------------------------------ */
const contentDir = process.env.SITE_CONTENT ?? path.resolve(ROOT, '../endtoendtester/nextjs-app/content');
const covered = new Set(samples.map((s) => s.ref));

console.log(`\n  ${samples.length} sample directories across ${new Set(samples.map((s) => s.ref)).size} articles`);
console.log(`  ${samples.filter((s) => s.runs).length} run in CI, ${samples.filter((s) => !s.runs).length} are reference only\n`);

if (!isDir(contentDir)) {
  console.log(`  (site content not found at ${contentDir} — skipping the coverage check)\n`);
  process.exit(process.exitCode ?? 0);
}

const articles = [];
for (const pillar of readdirSync(contentDir)) {
  const pillarPath = path.join(contentDir, pillar);
  if (!isDir(pillarPath)) continue;
  for (const file of readdirSync(pillarPath)) {
    if (!file.endsWith('.md') || file === '_pillar.md') continue;
    articles.push(`${pillar}/${file.replace(/\.md$/, '')}`);
  }
}

const missing = articles.filter((ref) => !covered.has(ref)).sort();
const orphan = [...covered].filter((ref) => !articles.includes(ref)).sort();

console.log(`  ${articles.length} articles on the site, ${articles.length - missing.length} with a sample`);

if (orphan.length) {
  console.error('\n  ✗ samples pointing at articles that do not exist:');
  for (const ref of orphan) console.error(`      ${ref}`);
  process.exitCode = 1;
}

if (missing.length) {
  console.log('\n  articles with no sample:');
  for (const ref of missing) console.log(`      ${ref}`);
}
console.log();
