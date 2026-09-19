import fs from 'node:fs';
import path from 'node:path';

/* A lint for test names, run as a test. If a CI failure should tell you
   what broke without opening a file, that is a property you can check.
   https://endtoendtester.com/practices/test-naming */

const SRC = path.resolve(__dirname, '../..');

function testFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) testFiles(full, found);
    // The linter skips itself: its own regex source contains the exact
    // shapes it is looking for, so scanning it finds the pattern, not tests.
    else if (/\.test\.tsx?$/.test(entry.name) && full !== __filename) found.push(full);
  }
  return found;
}

interface TestName {
  file: string;
  name: string;
}

function namesIn(file: string): TestName[] {
  const source = fs.readFileSync(file, 'utf8');
  const names: TestName[] = [];
  // `it('...')`, `it.each(...)('...')`, `test('...')` — single or double quoted.
  const pattern = /\b(?:it|test)(?:\.each\([\s\S]*?\)|\.skip|\.only|\.failing)?\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
  for (const match of source.matchAll(pattern)) {
    names.push({ file: path.relative(SRC, file), name: match[2] });
  }
  return names;
}

const GENERIC = [
  /^test\d*$/i,
  /^tests?$/i,
  /^works?$/i,
  /^should work$/i,
  /^it works$/i,
  /^ok$/i,
  /^happy path$/i,
  /^case \d+$/i
];

describe('every test in this repository is named so a CI failure is legible', () => {
  const all = testFiles(SRC).flatMap(namesIn);

  it('finds tests to check, or the extractor has silently stopped working', () => {
    expect(all.length).toBeGreaterThan(50);
  });

  it('has no generic placeholder names', () => {
    const offenders = all.filter(({ name }) => GENERIC.some((pattern) => pattern.test(name.trim())));

    expect(offenders).toEqual([]);
  });

  it('never starts a name with "test" — the runner already knows', () => {
    const offenders = all.filter(({ name }) => /^test[\s_]/i.test(name));

    expect(offenders).toEqual([]);
  });

  /* A name has to carry a condition and an outcome, and neither fits in
     two words. This is a proxy for that, and a cheap one. */
  it('names a condition and an outcome, not just a subject', () => {
    // A printf placeholder stands in for one word of the rendered name.
    const words = (name: string) => name.replace(/%[sdifjoOp#%]/g, 'x').trim().split(/\s+/).length;
    const offenders = all.filter(({ name }) => words(name) < 4);

    expect(offenders).toEqual([]);
  });

  it('leaves no unfinished markers in a test name', () => {
    const offenders = all.filter(({ name }) => /\b(TODO|FIXME|XXX|WIP)\b/i.test(name));

    expect(offenders).toEqual([]);
  });

  it('has no duplicate names inside one file, which makes a report ambiguous', () => {
    const byFile = new Map<string, string[]>();
    for (const { file, name } of all) byFile.set(file, [...(byFile.get(file) ?? []), name]);

    const duplicated = [...byFile.entries()].flatMap(([file, names]) => {
      const seen = new Set<string>();
      return names.filter((name) => (seen.has(name) ? true : (seen.add(name), false))).map((name) => ({ file, name }));
    });

    expect(duplicated).toEqual([]);
  });
});
