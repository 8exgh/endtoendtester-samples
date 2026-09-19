# Terraform Test Infrastructure — HCL

The runnable sample for **[Terraform Test Infrastructure](https://endtoendtester.com/ci-cd/terraform-test-infrastructure)**.

[![quality-and-infra.yml](https://github.com/8exgh/endtoendtester-samples/actions/workflows/quality-and-infra.yml/badge.svg?branch=main)](https://github.com/8exgh/endtoendtester-samples/actions/workflows/quality-and-infra.yml?query=branch%3Amain)

Runs on every push. The badge above is live; click it for the last result.

## Running it

```bash
cd terraform && terraform init -backend=false && terraform test
```

---

Part of [endtoendtester.com](https://endtoendtester.com) — a connected reference for test automation.
Every article's samples are listed at [https://endtoendtester.com/samples](https://endtoendtester.com/samples).
