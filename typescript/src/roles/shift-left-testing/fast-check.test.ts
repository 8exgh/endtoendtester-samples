import { fitsTheInnerLoop, runChecks, type Check } from './fast-check';

/* https://endtoendtester.com/roles/shift-left-testing */

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('the inner loop', () => {
  it('reports how long each check took and whether it fits its budget', async () => {
    const checks: Check[] = [
      { name: 'lint', budgetMs: 500, run: () => sleep(5) },
      { name: 'typecheck', budgetMs: 500, run: () => sleep(5) }
    ];

    const results = await runChecks(checks);

    expect(results.map((r) => r.name)).toEqual(['lint', 'typecheck']);
    expect(results.every((r) => r.withinBudget)).toBe(true);
  });

  it('marks a check that blew its budget rather than only failing on error', async () => {
    const results = await runChecks([{ name: 'slow', budgetMs: 1, run: () => sleep(30) }]);

    expect(results[0].withinBudget).toBe(false);
    expect(results[0].error).toBeUndefined();
  });

  it('records the failure without stopping the remaining checks', async () => {
    const results = await runChecks([
      {
        name: 'unit',
        budgetMs: 500,
        run: () => {
          throw new Error('two tests failed');
        }
      },
      { name: 'lint', budgetMs: 500, run: () => undefined }
    ]);

    expect(results[0].error).toBe('two tests failed');
    expect(results[1].error).toBeUndefined();
  });

  /* Shifting left works when the support shifts with it. The support, in
     practice, is this: a loop fast enough that running it is not a
     decision anybody has to make. */
  it('fails the whole loop when a check errored, however quick it was', async () => {
    const results = await runChecks([
      {
        name: 'unit',
        budgetMs: 500,
        run: () => {
          throw new Error('red');
        }
      }
    ]);

    expect(fitsTheInnerLoop(results, 10_000)).toBe(false);
  });

  it('fails the whole loop when the total exceeds what anyone will wait for', async () => {
    const results = await runChecks([
      { name: 'a', budgetMs: 1_000, run: () => sleep(20) },
      { name: 'b', budgetMs: 1_000, run: () => sleep(20) }
    ]);

    expect(fitsTheInnerLoop(results, 10)).toBe(false);
    expect(fitsTheInnerLoop(results, 10_000)).toBe(true);
  });
});
