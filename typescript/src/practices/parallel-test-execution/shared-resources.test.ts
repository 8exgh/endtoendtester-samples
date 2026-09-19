import {
  ScopedCounter,
  bumpSharedCounter,
  listenOnEphemeralPort,
  readSharedCounter,
  uniqueEmail
} from './shared-resources';

/* https://endtoendtester.com/practices/parallel-test-execution */

describe('ports', () => {
  it('gives two concurrent servers two different ports', async () => {
    const [a, b] = await Promise.all([listenOnEphemeralPort(), listenOnEphemeralPort()]);

    try {
      expect(a.port).not.toBe(b.port);
      expect(a.port).toBeGreaterThan(0);
    } finally {
      a.server.close();
      b.server.close();
    }
  });

  it('can stand up ten at once without a collision', async () => {
    const servers = await Promise.all(Array.from({ length: 10 }, listenOnEphemeralPort));

    try {
      expect(new Set(servers.map((s) => s.port)).size).toBe(10);
    } finally {
      servers.forEach((s) => s.server.close());
    }
  });
});

describe('unique data', () => {
  it('never repeats an address across ten thousand draws', () => {
    const drawn = new Set(Array.from({ length: 10_000 }, () => uniqueEmail()));

    expect(drawn.size).toBe(10_000);
  });

  it('separates two workers even if their random parts ever agreed', () => {
    const fromWorkerOne = uniqueEmail(1);
    const fromWorkerTwo = uniqueEmail(2);

    expect(fromWorkerOne).toContain('buyer-1-');
    expect(fromWorkerTwo).toContain('buyer-2-');
  });
});

describe('shared mutable state', () => {
  /* These two tests demonstrate the hazard: the second only passes because
     the first ran, which is exactly the coupling that parallelism exposes
     and that shuffling the order breaks. */
  it('a process-wide counter carries a value between tests', () => {
    bumpSharedCounter();

    expect(readSharedCounter()).toBeGreaterThanOrEqual(1);
  });

  it('and the next test sees it, which is the whole problem', () => {
    const before = readSharedCounter();

    bumpSharedCounter();

    expect(readSharedCounter()).toBe(before + 1);
    expect(before).toBeGreaterThanOrEqual(1); // proof it leaked
  });

  it('scoped state starts from nothing every time, however it is ordered', () => {
    const counter = new ScopedCounter();

    counter.bump();

    expect(counter.read()).toBe(1);
  });

  it('and a second scope is untouched by the first', () => {
    expect(new ScopedCounter().read()).toBe(0);
  });
});
