import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

/* A performance test has to answer a question. "Is it fast?" is not one.
 * "Can the checkout endpoint serve 50 requests a second with a 95th
 * percentile under 400ms?" is — and the thresholds below are what turn
 * this from a number into a gate.
 * https://endtoendtester.com/quality/performance-testing
 */

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:4321';
const checkoutLatency = new Trend('checkout_latency', true);

export const options = {
  scenarios: {
    steady: {
      /* An arrival-rate executor, not a fixed pool of virtual users.
         With fixed VUs each one waits for its response before sending the
         next, so the offered load falls exactly when the system slows
         down — coordinated omission, and it makes most homegrown load
         tests optimistic by a large factor. */
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 50),
      timeUnit: '1s',
      duration: __ENV.DURATION || '20s',
      preAllocatedVUs: 20,
      maxVUs: 100
    }
  },
  thresholds: {
    // The test fails if these are not met. This is the part that matters.
    http_req_failed: ['rate<0.01'],
    checkout_latency: ['p(95)<400', 'p(99)<1500'],
    'checks{type:placed}': ['rate>0.99']
  }
};

export default function () {
  const session = `perf-${__VU}-${__ITER}`;

  const added = http.post(
    `${BASE}/api/cart`,
    JSON.stringify({ session, slug: 'field-notes', quantity: 1 }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'add-to-cart' } }
  );
  check(added, { 'cart accepted the item': (r) => r.status === 201 });

  const started = Date.now();
  const order = http.post(
    `${BASE}/api/checkout`,
    JSON.stringify({ session, card: '4242424242424242' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'checkout' } }
  );
  checkoutLatency.add(Date.now() - started);

  check(order, { 'order was placed': (r) => r.status === 201 }, { type: 'placed' });

  sleep(0.1);
}
