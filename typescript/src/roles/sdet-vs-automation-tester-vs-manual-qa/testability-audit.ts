import fs from 'node:fs';
import path from 'node:path';

/* An SDET's product is testability, and testability is measurable. This is
   the smallest useful version of that: find the modules that reach out and
   grab their own I/O, because those are the ones nobody can test in
   isolation.
   https://endtoendtester.com/roles/sdet-vs-automation-tester-vs-manual-qa */

/** A direct dependency on something that crosses a process boundary. */
const HARD_EDGES = [
  { pattern: /\bfrom ['"]node:fs['"]/, edge: 'the file system' },
  { pattern: /\bfrom ['"]node:child_process['"]/, edge: 'a subprocess' },
  { pattern: /\bnew Date\(\)/, edge: 'the wall clock' },
  { pattern: /\bDate\.now\(\)/, edge: 'the wall clock' },
  { pattern: /\bMath\.random\(\)/, edge: 'randomness' },
  { pattern: /\bprocess\.env\./, edge: 'the environment' }
];

export interface Finding {
  module: string;
  edge: string;
  line: number;
}

export function auditFile(relative: string, source: string): Finding[] {
  const findings: Finding[] = [];

  source.split('\n').forEach((text, index) => {
    /* A line that names the seam is the seam, not a violation of it.
       The second pattern is the subtle one: `now = Date.now()` in a
       parameter list is a default that callers can replace, which is the
       injection seam rather than a hard edge. Reading the same call in the
       middle of a function body is the thing worth flagging. */
    if (/inject|Clock|clock|IdSource|TimeProvider/.test(text)) return;
    if (/\b(now|newId|random|clock|uuid)\s*[=:]\s*(Date\.now|Math\.random|crypto\.randomUUID)/.test(text)) return;

    for (const { pattern, edge } of HARD_EDGES) {
      if (pattern.test(text)) findings.push({ module: relative, edge, line: index + 1 });
    }
  });

  return findings;
}

export function audit(root: string, skip: (relative: string) => boolean = () => false): Finding[] {
  const findings: Finding[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) continue;

      const relative = path.relative(root, full);
      if (skip(relative)) continue;
      findings.push(...auditFile(relative, fs.readFileSync(full, 'utf8')));
    }
  };

  walk(root);
  return findings;
}
