# Load Testing — JavaScript (k6)

The runnable sample for **[Load Testing](https://endtoendtester.com/quality/load-testing)**.

[![quality-and-infra.yml](https://github.com/8exgh/endtoendtester-samples/actions/workflows/quality-and-infra.yml/badge.svg?branch=main)](https://github.com/8exgh/endtoendtester-samples/actions/workflows/quality-and-infra.yml?query=branch%3Amain)

Runs on every push. The badge above is live; click it for the last result.

## Running it

```bash
cd browser && npm ci && node app/server.mjs &
cd k6 && k6 run quality/performance-testing/checkout-latency.js
```

---

Part of [endtoendtester.com](https://endtoendtester.com) — a connected reference for test automation.
Every article's samples are listed at [https://endtoendtester.com/samples](https://endtoendtester.com/samples).
