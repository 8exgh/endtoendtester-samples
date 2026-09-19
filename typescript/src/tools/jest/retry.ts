export interface RetryOptions {
  retries: number;
  baseMs: number;
}

/** Exponential backoff. Testable only because the waiting goes through
    timers the test can control. https://endtoendtester.com/tools/jest */
export async function retryWithBackoff<T>(
  attempt: () => Promise<T>,
  { retries, baseMs }: RetryOptions
): Promise<T> {
  let lastError: unknown;

  for (let n = 0; n <= retries; n++) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      if (n === retries) break;
      await new Promise((resolve) => setTimeout(resolve, baseMs * 2 ** n));
    }
  }

  throw lastError;
}
