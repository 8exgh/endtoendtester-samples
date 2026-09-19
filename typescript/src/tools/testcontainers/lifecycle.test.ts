import { GenericContainer, Wait } from 'testcontainers';
import { migrate, startPostgres } from '../../_db/postgres';

/* The mechanics: wait strategies, reuse scope, and running something that
   is not a database. https://endtoendtester.com/tools/testcontainers */

jest.setTimeout(180_000);

describe('wait strategies', () => {
  /* A started container is not a ready one, and homemade wait strategies
     that miss that are the most common source of a flaky container suite. */
  it('waits for a log line before handing the container over', async () => {
    const container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start();

    try {
      expect(container.getMappedPort(6379)).toBeGreaterThan(0);
    } finally {
      await container.stop();
    }
  });

  it('maps to an ephemeral host port, which is what makes it parallel-safe', async () => {
    const [a, b] = await Promise.all([
      new GenericContainer('redis:7-alpine').withExposedPorts(6379).withWaitStrategy(Wait.forListeningPorts()).start(),
      new GenericContainer('redis:7-alpine').withExposedPorts(6379).withWaitStrategy(Wait.forListeningPorts()).start()
    ]);

    try {
      // Two containers, the same container port, two different host ports.
      expect(a.getMappedPort(6379)).not.toBe(b.getMappedPort(6379));
    } finally {
      await Promise.all([a.stop(), b.stop()]);
    }
  });
});

describe('a real dependency, from the image production runs', () => {
  it('starts Postgres and applies the migrations to it', async () => {
    const container = await startPostgres();

    try {
      const ran = await migrate(container.getConnectionUri());

      // A fresh container runs every migration; that is the assertion that
      // the migrations work from nothing, not just from yesterday's state.
      expect(ran).toEqual(['001-orders', '002-currency']);
    } finally {
      await container.stop();
    }
  });
});
