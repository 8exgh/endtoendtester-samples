import fs from 'node:fs';
import path from 'node:path';

/* A definition of done that is only in a wiki is a definition of hope.
   This is the same list, enforced. https://endtoendtester.com/roles/quality-ownership */

const SRC = path.resolve(__dirname, '../..');

/* Exemptions are explicit and each carries a reason. A gate with no way to
   say "not this one" gets switched off entirely the first time it is
   wrong, which is worse than a gate with three documented holes. */
const EXEMPT: Record<string, string> = {
  '_app': 'the application under test; covered by component, API, authorization and security samples',
  '_db': 'container plumbing; exercised by the integration and database samples',
  'roles/shift-left-testing/fast-check.ts': 'a script, run by its own sample rather than imported'
};

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, found);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

const isExempt = (relative: string) =>
  Object.keys(EXEMPT).some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`));

describe('the definition of done, as a build gate', () => {
  const modules = sourceFiles(SRC).map((file) => path.relative(SRC, file));

  it('finds modules to check, or the walker has silently stopped working', () => {
    expect(modules.length).toBeGreaterThan(20);
  });

  /* "Every module has a test" is the claim. Anything that cannot meet it
     has to say why, in writing, here. */
  it('has a test beside every module, or a stated reason why not', () => {
    const uncovered = modules.filter((relative) => {
      if (isExempt(relative)) return false;

      const directory = path.dirname(path.join(SRC, relative));
      const tests = fs
        .readdirSync(directory)
        .filter((name) => /\.test\.tsx?$/.test(name));
      return tests.length === 0;
    });

    expect(uncovered).toEqual([]);
  });

  it('carries a reason for every exemption rather than a bare list', () => {
    for (const [target, reason] of Object.entries(EXEMPT)) {
      expect(reason.length).toBeGreaterThan(20);
      expect(fs.existsSync(path.join(SRC, target))).toBe(true);
    }
  });

  /* An exemption that no longer applies is worse than no exemption: it is
     a hole nobody remembers opening. */
  it('has no exemption that has outlived the thing it exempted', () => {
    const stale = Object.keys(EXEMPT).filter((target) => !fs.existsSync(path.join(SRC, target)));

    expect(stale).toEqual([]);
  });
});
