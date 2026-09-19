import http from 'k6/http';
import { check } from 'k6';

/* Four profiles, four questions. Run one at a time:
 *   k6 run -e SCENARIO=stress quality/load-testing/stress-and-spike.js
 *
 * https://endtoendtester.com/quality/load-testing
 */

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:4321';
const SCENARIO = __ENV.SCENARIO || 'load';

const scenarios = {
  // Can we serve the traffic we expect?
  load: {
    executor: 'constant-arrival-rate',
    rate: Number(__ENV.RATE || 50),
    timeUnit: '1s',
    duration: __ENV.DURATION || '20s',
    preAllocatedVUs: 20,
    maxVUs: 200
  },

  // What breaks first, and how? Climb until something gives.
  stress: {
    executor: 'ramping-arrival-rate',
    startRate: 20,
    timeUnit: '1s',
    preAllocatedVUs: 50,
    maxVUs: 500,
    stages: [
      { target: 50, duration: '10s' },
      { target: 200, duration: '10s' },
      { target: 500, duration: '10s' }
    ]
  },

  // What a marketing email looks like, and whether it recovers afterwards.
  spike: {
    executor: 'ramping-arrival-rate',
    startRate: 10,
    timeUnit: '1s',
    preAllocatedVUs: 50,
    maxVUs: 500,
    stages: [
      { target: 10, duration: '5s' },
      { target: 300, duration: '5s' },
      { target: 300, duration: '10s' },
      { target: 10, duration: '5s' }
    ]
  },

  // Does anything degrade over time? Run this for hours, not seconds.
  soak: {
    executor: 'constant-arrival-rate',
    rate: 20,
    timeUnit: '1s',
    duration: __ENV.DURATION || '30s',
    preAllocatedVUs: 20,
    maxVUs: 60
  }
};

export const options = {
  scenarios: { [SCENARIO]: scenarios[SCENARIO] },
  thresholds: {
    // Deliberately loose for the stress profile: the point of a stress run
    // is to find the breaking point, not to assert there isn't one.
    http_req_failed: [SCENARIO === 'stress' ? 'rate<0.5' : 'rate<0.02'],
    http_req_duration: [SCENARIO === 'stress' ? 'p(95)<10000' : 'p(95)<1000']
  }
};

export default function () {
  const response = http.get(`${BASE}/api/shipping-rate`, { tags: { name: 'shipping-rate' } });

  check(response, {
    'answered at all': (r) => r.status !== 0,
    'answered correctly': (r) => r.status === 200
  });
}

export function handleSummary(data) {
  /* The shape of the failure is the diagnosis:
   *   latency climbs linearly, errors flat  -> a saturated resource queueing
   *   latency flat, then a vertical cliff   -> a pool or limit exhausted
   *   errors spike, latency stays low       -> something failing fast
   */
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] ?? 0;
  const failed = data.metrics.http_req_failed?.values?.rate ?? 0;

  return {
    stdout: `\n  scenario ${SCENARIO}: p95 ${p95.toFixed(1)}ms, ${(failed * 100).toFixed(2)}% failed\n\n`,
    'reports/summary.json': JSON.stringify(data, null, 2)
  };
}
