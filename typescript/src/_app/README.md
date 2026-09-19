# The application under test

One small service, tested at four different levels by four different
samples. That is deliberate: the
[testing pyramid](https://endtoendtester.com/testing-levels/testing-pyramid)
is an argument about which level a given risk belongs at, and it is much
easier to see when the same code is under all of them.

Used by:

| Sample | Level |
|---|---|
| `testing-levels/testing-pyramid` | the same bug, caught at three levels |
| `testing-levels/component-testing` | the whole service through its HTTP interface |
| `platforms/api-testing` | contracts, status codes, pagination, idempotency |
| `quality/authorization-testing` | the access-control matrix |
| `quality/security-testing` | headers, injection round-trips, lockout |

It has no database on purpose — the samples that need a real one start a
container instead, in `testing-levels/integration-testing`.
