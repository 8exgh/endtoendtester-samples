import {
  RateLimitedError,
  RatesClient,
  RatesTimeoutError,
  RatesUnavailableError
} from './rates-client';
import { json, startStub, type StubServer } from './stub-server';

/* Almost entirely the unhappy paths, because those are the ones a real
   dependency will not produce on demand.
   https://endtoendtester.com/testing-levels/integration-testing-with-stubs */

let stub: StubServer;
afterEach(async () => stub?.close());

describe('the happy path still goes over a real socket', () => {
  it('parses a successful response', async () => {
    stub = await startStub((_req, res) => json(res, 200, { base: 'USD', rates: { GBP: 0.79 } }));

    await expect(new RatesClient(stub.url).gbpRate()).resolves.toBe(0.79);
  });

  it('sends the headers the upstream contract asks for', async () => {
    let accept: string | undefined;
    stub = await startStub((req, res) => {
      accept = req.headers.accept;
      json(res, 200, { rates: { GBP: 0.79 } });
    });

    await new RatesClient(stub.url).gbpRate();

    expect(accept).toBe('application/json');
  });
});

describe('failures the real service will not give you on request', () => {
  it('retries a 503 and succeeds on the second attempt', async () => {
    stub = await startStub((_req, res, call) => {
      if (call === 1) return json(res, 503, { error: 'unavailable' });
      return json(res, 200, { rates: { GBP: 0.79 } });
    });

    const client = new RatesClient(stub.url, { retries: 1 });

    await expect(client.gbpRate()).resolves.toBe(0.79);
    expect(stub.calls).toBe(2);
  });

  it('gives up after the configured number of retries', async () => {
    stub = await startStub((_req, res) => json(res, 503, {}));

    await expect(new RatesClient(stub.url, { retries: 2 }).gbpRate()).rejects.toBeInstanceOf(
      RatesUnavailableError
    );
    expect(stub.calls).toBe(3); // the first attempt plus two retries
  });

  it('times out rather than hanging on a server that never answers', async () => {
    stub = await startStub(() => {
      /* deliberately never responds */
    });

    await expect(
      new RatesClient(stub.url, { timeoutMs: 100, retries: 0 }).gbpRate()
    ).rejects.toBeInstanceOf(RatesTimeoutError);
  });

  /* A rate limit must not be retried: the server has said how long to wait,
     and hammering it is how a limit becomes a ban. */
  it('surfaces a rate limit with its Retry-After rather than retrying', async () => {
    stub = await startStub((_req, res) =>
      json(res, 429, { error: 'slow down' }, { 'retry-after': '120' })
    );

    const error = await new RatesClient(stub.url, { retries: 3 })
      .gbpRate()
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RateLimitedError);
    expect((error as RateLimitedError).retryAfterSeconds).toBe(120);
    expect(stub.calls).toBe(1);
  });

  it('rejects a 200 whose body is the wrong shape', async () => {
    stub = await startStub((_req, res) => json(res, 200, { rates: { USD: 1 } }));

    await expect(new RatesClient(stub.url).gbpRate()).rejects.toThrow(/did not contain a GBP rate/);
  });

  it('rejects a 200 that is not JSON at all', async () => {
    stub = await startStub((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('<html>maintenance</html>');
    });

    await expect(new RatesClient(stub.url).gbpRate()).rejects.toBeInstanceOf(Error);
  });

  it('survives a connection reset mid-response', async () => {
    stub = await startStub((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.socket?.destroy();
    });

    await expect(new RatesClient(stub.url, { retries: 0 }).gbpRate()).rejects.toBeInstanceOf(Error);
  });
});
