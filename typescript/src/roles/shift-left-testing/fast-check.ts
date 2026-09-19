/* The inner loop is the highest-frequency feedback there is, and whether
   it is fast is the thing that decides whether anybody runs it.
   https://endtoendtester.com/roles/shift-left-testing */

export interface Check {
  name: string;
  /** Milliseconds this check is allowed before it stops being "inner loop". */
  budgetMs: number;
  run: () => void | Promise<void>;
}

export interface CheckResult {
  name: string;
  elapsedMs: number;
  withinBudget: boolean;
  error?: string;
}

export async function runChecks(checks: Check[]): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const check of checks) {
    const started = Date.now();
    let error: string | undefined;
    try {
      await check.run();
    } catch (thrown) {
      error = thrown instanceof Error ? thrown.message : String(thrown);
    }
    const elapsedMs = Date.now() - started;
    results.push({ name: check.name, elapsedMs, withinBudget: elapsedMs <= check.budgetMs, error });
  }

  return results;
}

/** A single number to put in front of people: does the whole loop fit in
    the time somebody will actually wait? */
export function fitsTheInnerLoop(results: CheckResult[], totalBudgetMs: number): boolean {
  return (
    results.every((result) => !result.error) &&
    results.reduce((sum, result) => sum + result.elapsedMs, 0) <= totalBudgetMs
  );
}
