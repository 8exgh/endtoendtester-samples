import { totalInGbp } from './invoice';
import { convert, fetchGbpRate } from './rates-client';

/* The mechanics, and the discipline about when not to use them.
   https://endtoendtester.com/tools/jest-mocking */

// Hoisted above the imports by Jest's transform, which is why the factory
// cannot close over anything declared later in this file.
jest.mock('./rates-client', () => ({
  ...jest.requireActual('./rates-client'), // keep `convert` real
  fetchGbpRate: jest.fn()
}));

const mockFetchRate = fetchGbpRate as jest.MockedFunction<typeof fetchGbpRate>;

describe('a partial module mock', () => {
  it('replaces only the function that does I/O', async () => {
    mockFetchRate.mockResolvedValue(0.79);

    await expect(totalInGbp({ usdCents: 10_000 })).resolves.toBe(7_900);
  });

  /* `convert` is the real implementation, so its rounding is genuinely
     under test rather than stubbed away. */
  it('leaves the pure function in the module untouched', () => {
    expect(convert(333, 0.79)).toBe(263);
  });

  it('propagates a failure from the mocked call', async () => {
    mockFetchRate.mockRejectedValue(new Error('rates unavailable: 503'));

    await expect(totalInGbp({ usdCents: 100 })).rejects.toThrow('503');
  });
});

describe('spyOn, which is preferable when you have a reference', () => {
  const gateway = {
    charge: async (cents: number) => ({ id: `pi_${cents}` })
  };

  it('wraps a real method and can be restored afterwards', async () => {
    const spy = jest.spyOn(gateway, 'charge').mockResolvedValue({ id: 'pi_stub' });

    await expect(gateway.charge(4_000)).resolves.toEqual({ id: 'pi_stub' });
    expect(spy).toHaveBeenCalledWith(4_000);

    spy.mockRestore();
    await expect(gateway.charge(4_000)).resolves.toEqual({ id: 'pi_4000' });
  });
});

describe('a plain jest.fn, which is the least coupled option of all', () => {
  /* When the double can simply be passed in, nothing needs mocking. */
  it('needs no module machinery at all', async () => {
    const send = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

    const notify = async (to: string, mailer: (to: string) => Promise<void>) => mailer(to);
    await notify('a@example.test', send);

    expect(send).toHaveBeenCalledWith('a@example.test');
  });
});

describe('the hoisting trap', () => {
  /* Jest allows a hoisted factory to reference a variable only when its
     name begins with `mock`. This test documents the rule rather than
     demonstrating the crash, which would not compile. */
  it('permits a mock-prefixed binding inside a hoisted factory', () => {
    expect(mockFetchRate).toBeDefined();
    expect(jest.isMockFunction(mockFetchRate)).toBe(true);
  });
});
