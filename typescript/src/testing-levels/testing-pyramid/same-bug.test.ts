import request from 'supertest';
import { createApp } from '../../_app/app';
import { FREE_SHIPPING_THRESHOLD_CENTS, shippingCents } from '../../_app/pricing';

/* One rule — free shipping at or above £50 — verified at three levels, so
   the cost and the diagnostic value of each can be compared directly.
   https://endtoendtester.com/testing-levels/testing-pyramid */

const timings: Record<string, number> = {};

async function timed(level: string, run: () => Promise<void> | void) {
  const started = performance.now();
  await run();
  timings[level] = performance.now() - started;
}

describe('the rule, at the unit level', () => {
  /* Fails naming the function. Microseconds. This is where the boundary
     belongs, and where `>=` versus `>` is actually decided. */
  it('is free at exactly the threshold', async () => {
    await timed('unit', () => {
      expect(shippingCents(FREE_SHIPPING_THRESHOLD_CENTS, 'standard')).toBe(0);
      expect(shippingCents(FREE_SHIPPING_THRESHOLD_CENTS - 1, 'standard')).toBe(395);
    });
  });
});

describe('the rule, at the component level', () => {
  /* Fails saying "the orders endpoint returns the wrong total". Milliseconds,
     and it proves the rule is actually wired into the response — which the
     unit test cannot. */
  it('is reflected in the order total the API returns', async () => {
    const app = createApp();

    await timed('component', async () => {
      const { body } = await request(app)
        .post('/orders')
        .set('Authorization', 'Bearer alice:acme:member')
        .send({ sku: 'desk-3', quantity: 1 })
        .expect(201);

      expect(body.subtotalCents).toBeGreaterThanOrEqual(FREE_SHIPPING_THRESHOLD_CENTS);
      expect(body.shippingCents).toBe(0);
    });
  });
});

describe('the rule, as a journey', () => {
  /* Stands in for the browser test. Fails saying "checkout is broken", and
     then you go and find out why. The real version of this costs seconds
     and an environment — see /testing-levels/end-to-end-testing. */
  it('a customer placing a large order is charged no shipping', async () => {
    const app = createApp();
    const alice = 'Bearer alice:acme:member';

    await timed('journey', async () => {
      const created = await request(app)
        .post('/orders')
        .set('Authorization', alice)
        .send({ sku: 'desk-3', quantity: 1 })
        .expect(201);

      const read = await request(app).get(created.headers.location).set('Authorization', alice).expect(200);
      const listed = await request(app).get('/orders').set('Authorization', alice).expect(200);

      expect(read.body.totalCents).toBe(read.body.subtotalCents);
      expect(listed.body.items.some((o: { id: string }) => o.id === created.body.id)).toBe(true);
    });
  });
});

describe('what the three cost', () => {
  it('records a cost for every level, cheapest at the bottom', () => {
    // Reported rather than asserted on: a timing assertion in CI is a flaky
    // test waiting to happen. See /practices/flaky-tests.
    const report = Object.entries(timings)
      .map(([level, ms]) => `${level.padEnd(10)} ${ms.toFixed(3)}ms`)
      .join('\n  ');
    console.log(`\n  cost of verifying one rule at each level:\n  ${report}\n`);

    expect(Object.keys(timings).sort()).toEqual(['component', 'journey', 'unit']);
  });
});
