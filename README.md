# End To End Tester — samples

Every article on **[endtoendtester.com](https://endtoendtester.com)** has a runnable sample here,
and all but four of them run in CI on every push.

[![browser-tools](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser-tools.yml/badge.svg?branch=main)](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser-tools.yml?query=branch%3Amain)
[![browser](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml/badge.svg?branch=main)](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml?query=branch%3Amain)
[![dotnet](https://github.com/8exgh/endtoendtester-samples/actions/workflows/dotnet.yml/badge.svg?branch=main)](https://github.com/8exgh/endtoendtester-samples/actions/workflows/dotnet.yml?query=branch%3Amain)
[![flutter-angular-pipelines](https://github.com/8exgh/endtoendtester-samples/actions/workflows/flutter-angular-pipelines.yml/badge.svg?branch=main)](https://github.com/8exgh/endtoendtester-samples/actions/workflows/flutter-angular-pipelines.yml?query=branch%3Amain)
[![java](https://github.com/8exgh/endtoendtester-samples/actions/workflows/java.yml/badge.svg?branch=main)](https://github.com/8exgh/endtoendtester-samples/actions/workflows/java.yml?query=branch%3Amain)
[![other-languages](https://github.com/8exgh/endtoendtester-samples/actions/workflows/other-languages.yml/badge.svg?branch=main)](https://github.com/8exgh/endtoendtester-samples/actions/workflows/other-languages.yml?query=branch%3Amain)
[![quality-and-infra](https://github.com/8exgh/endtoendtester-samples/actions/workflows/quality-and-infra.yml/badge.svg?branch=main)](https://github.com/8exgh/endtoendtester-samples/actions/workflows/quality-and-infra.yml?query=branch%3Amain)
[![typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml/badge.svg?branch=main)](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain)

## What this is

87 sample directories covering all 83 articles, in
TypeScript, C#, Java, Python, Ruby, Dart, Gherkin, HCL and four CI
platforms' own configuration languages.

The directory layout mirrors the site: `practices/flaky-tests` on the site
is `<workspace>/.../practices/flaky-tests` here, so there is nothing to look
up.

Every sample is a **working test**, not a fragment. Several of them found
real defects while being written — the Java money type was overflowing
silently, the browser coverage sample was double-counting V8's nested
ranges and reporting 123% of a file executed, and the test-naming lint
failed on four of this repository's own test names. Those are all fixed,
and the comments explaining them are the point.

## Running everything

Each workspace is independent:

```bash
cd typescript      && npm ci && npm test
cd browser         && npm ci && npx playwright install --with-deps chromium && npx playwright test
cd vitest          && npm ci && npx vitest run
cd angular         && npm ci && npx jest
cd dotnet          && dotnet test Samples.sln
cd java            && mvn -B test
cd python          && pip install -r requirements.txt && PYTHONPATH=. pytest
cd ruby            && bundle install && bundle exec rspec
cd cucumber        && npm ci && npx cucumber-js
cd flutter         && flutter pub get && flutter test
cd terraform       && terraform init -backend=false && terraform test
```

Two demonstrations are worth running by hand, because each asserts that it
still demonstrates what it claims:

```bash
cd typescript && npm run coverage:metrics   # 100% lines, 83% branches — the gap
cd typescript && npm run mutation           # surviving mutants in 100%-covered code
```

## The samples


### ci-cd

| Article | Sample | Language | CI |
|---|---|---|---|
| [Azure Devops Pipelines](https://endtoendtester.com/ci-cd/azure-devops-pipelines) | [`pipelines/ci-cd/azure-devops-pipelines`](pipelines/ci-cd/azure-devops-pipelines) | YAML / Groovy / Kotlin | [flutter-angular-pipelines](https://github.com/8exgh/endtoendtester-samples/actions/workflows/flutter-angular-pipelines.yml?query=branch%3Amain) |
| [Bitbucket Pipelines](https://endtoendtester.com/ci-cd/bitbucket-pipelines) | [`pipelines/ci-cd/bitbucket-pipelines`](pipelines/ci-cd/bitbucket-pipelines) | YAML / Groovy / Kotlin | [flutter-angular-pipelines](https://github.com/8exgh/endtoendtester-samples/actions/workflows/flutter-angular-pipelines.yml?query=branch%3Amain) |
| [Github Actions](https://endtoendtester.com/ci-cd/github-actions) | [`.github/workflows`](.github/workflows) | YAML | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Jenkins](https://endtoendtester.com/ci-cd/jenkins) | [`pipelines/ci-cd/jenkins`](pipelines/ci-cd/jenkins) | YAML / Groovy / Kotlin | [flutter-angular-pipelines](https://github.com/8exgh/endtoendtester-samples/actions/workflows/flutter-angular-pipelines.yml?query=branch%3Amain) |
| [Playwright Sharding](https://endtoendtester.com/ci-cd/playwright-sharding) | [`browser/tests/ci-cd/playwright-sharding`](browser/tests/ci-cd/playwright-sharding) | TypeScript (Playwright) | [browser](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml?query=branch%3Amain) |
| [Teamcity](https://endtoendtester.com/ci-cd/teamcity) | [`pipelines/ci-cd/teamcity`](pipelines/ci-cd/teamcity) | YAML / Groovy / Kotlin | [flutter-angular-pipelines](https://github.com/8exgh/endtoendtester-samples/actions/workflows/flutter-angular-pipelines.yml?query=branch%3Amain) |
| [Terraform Test Infrastructure](https://endtoendtester.com/ci-cd/terraform-test-infrastructure) | [`terraform`](terraform) | HCL | [quality-and-infra](https://github.com/8exgh/endtoendtester-samples/actions/workflows/quality-and-infra.yml?query=branch%3Amain) |

### coverage

| Article | Sample | Language | CI |
|---|---|---|---|
| [Code Coverage](https://endtoendtester.com/coverage/code-coverage) | [`typescript/src/coverage/code-coverage`](typescript/src/coverage/code-coverage) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Coverage Metrics](https://endtoendtester.com/coverage/coverage-metrics) | [`typescript/src/coverage/coverage-metrics`](typescript/src/coverage/coverage-metrics) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [E2e Code Coverage](https://endtoendtester.com/coverage/e2e-code-coverage) | [`browser/tests/coverage/e2e-code-coverage`](browser/tests/coverage/e2e-code-coverage) | TypeScript (Playwright) | [browser](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml?query=branch%3Amain) |
| [Mutation Testing](https://endtoendtester.com/coverage/mutation-testing) | [`typescript/src/coverage/mutation-testing`](typescript/src/coverage/mutation-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |

### diagnostics

| Article | Sample | Language | CI |
|---|---|---|---|
| [Screen Recordings](https://endtoendtester.com/diagnostics/screen-recordings) | [`browser/tests/diagnostics/screen-recordings`](browser/tests/diagnostics/screen-recordings) | TypeScript (Playwright) | [browser](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml?query=branch%3Amain) |
| [Screenshots](https://endtoendtester.com/diagnostics/screenshots) | [`browser/tests/diagnostics/screenshots`](browser/tests/diagnostics/screenshots) | TypeScript (Playwright) | [browser](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml?query=branch%3Amain) |
| [Test Reporting](https://endtoendtester.com/diagnostics/test-reporting) | [`typescript/src/diagnostics/test-reporting`](typescript/src/diagnostics/test-reporting) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Trace Viewer](https://endtoendtester.com/diagnostics/trace-viewer) | [`browser/tests/diagnostics/trace-viewer`](browser/tests/diagnostics/trace-viewer) | TypeScript (Playwright) | [browser](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml?query=branch%3Amain) |

### languages

| Article | Sample | Language | CI |
|---|---|---|---|
| [Csharp](https://endtoendtester.com/languages/csharp) | [`dotnet/Tests.XUnit/languages/csharp`](dotnet/Tests.XUnit/languages/csharp) | C# | [dotnet](https://github.com/8exgh/endtoendtester-samples/actions/workflows/dotnet.yml?query=branch%3Amain) |
| [Java](https://endtoendtester.com/languages/java) | [`java/src/test/java/languages/java`](java/src/test/java/languages/java) | Java | [java](https://github.com/8exgh/endtoendtester-samples/actions/workflows/java.yml?query=branch%3Amain) |
| [Python](https://endtoendtester.com/languages/python) | [`python/tests/languages/python`](python/tests/languages/python) | Python | [other-languages](https://github.com/8exgh/endtoendtester-samples/actions/workflows/other-languages.yml?query=branch%3Amain) |
| [Typescript](https://endtoendtester.com/languages/typescript) | [`typescript/src/languages/typescript`](typescript/src/languages/typescript) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |

### platforms

| Article | Sample | Language | CI |
|---|---|---|---|
| [Android App Testing](https://endtoendtester.com/platforms/android-app-testing) | [`reference/platforms/android-app-testing`](reference/platforms/android-app-testing) | reference only | — reference only |
| [Api Testing](https://endtoendtester.com/platforms/api-testing) | [`typescript/src/platforms/api-testing`](typescript/src/platforms/api-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Avalonia Testing](https://endtoendtester.com/platforms/avalonia-testing) | [`dotnet/Tests.Avalonia/platforms/avalonia-testing`](dotnet/Tests.Avalonia/platforms/avalonia-testing) | C# (Avalonia headless) | [dotnet](https://github.com/8exgh/endtoendtester-samples/actions/workflows/dotnet.yml?query=branch%3Amain) |
| [Browser Testing](https://endtoendtester.com/platforms/browser-testing) | [`browser/tests/platforms/browser-testing`](browser/tests/platforms/browser-testing) | TypeScript (Playwright) | [browser](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml?query=branch%3Amain) |
| [Cross Browser Testing](https://endtoendtester.com/platforms/cross-browser-testing) | [`browser/tests/platforms/cross-browser-testing`](browser/tests/platforms/cross-browser-testing) | TypeScript (Playwright) | [browser](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml?query=branch%3Amain) |
| [Desktop Testing](https://endtoendtester.com/platforms/desktop-testing) | [`reference/platforms/desktop-testing`](reference/platforms/desktop-testing) | reference only | — reference only |
| [Flutter Testing](https://endtoendtester.com/platforms/flutter-testing) | [`flutter/test/platforms/flutter-testing`](flutter/test/platforms/flutter-testing) | Dart | [flutter-angular-pipelines](https://github.com/8exgh/endtoendtester-samples/actions/workflows/flutter-angular-pipelines.yml?query=branch%3Amain) |
| [Ios App Testing](https://endtoendtester.com/platforms/ios-app-testing) | [`reference/platforms/ios-app-testing`](reference/platforms/ios-app-testing) | reference only | — reference only |

### practices

| Article | Sample | Language | CI |
|---|---|---|---|
| [Arrange Act Assert](https://endtoendtester.com/practices/arrange-act-assert) | [`typescript/src/practices/arrange-act-assert`](typescript/src/practices/arrange-act-assert) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Behavior Driven Development](https://endtoendtester.com/practices/behavior-driven-development) | [`cucumber/features`](cucumber/features) | Gherkin | [other-languages](https://github.com/8exgh/endtoendtester-samples/actions/workflows/other-languages.yml?query=branch%3Amain) |
| [Dependency Injection](https://endtoendtester.com/practices/dependency-injection) | [`dotnet/Tests.XUnit/practices/dependency-injection`](dotnet/Tests.XUnit/practices/dependency-injection) | C# (TimeProvider) | [dotnet](https://github.com/8exgh/endtoendtester-samples/actions/workflows/dotnet.yml?query=branch%3Amain) |
| [Dependency Injection](https://endtoendtester.com/practices/dependency-injection) | [`typescript/src/practices/dependency-injection`](typescript/src/practices/dependency-injection) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Flaky Tests](https://endtoendtester.com/practices/flaky-tests) | [`typescript/src/practices/flaky-tests`](typescript/src/practices/flaky-tests) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Given When Then](https://endtoendtester.com/practices/given-when-then) | [`cucumber/features`](cucumber/features) | Gherkin | [other-languages](https://github.com/8exgh/endtoendtester-samples/actions/workflows/other-languages.yml?query=branch%3Amain) |
| [Page Object Model](https://endtoendtester.com/practices/page-object-model) | [`browser/tests/practices/page-object-model`](browser/tests/practices/page-object-model) | TypeScript (Playwright) | [browser](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml?query=branch%3Amain) |
| [Parallel Test Execution](https://endtoendtester.com/practices/parallel-test-execution) | [`typescript/src/practices/parallel-test-execution`](typescript/src/practices/parallel-test-execution) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Screenplay Pattern](https://endtoendtester.com/practices/screenplay-pattern) | [`typescript/src/practices/screenplay-pattern`](typescript/src/practices/screenplay-pattern) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Test Data Management](https://endtoendtester.com/practices/test-data-management) | [`python/tests/practices/test-data-management`](python/tests/practices/test-data-management) | Python | [other-languages](https://github.com/8exgh/endtoendtester-samples/actions/workflows/other-languages.yml?query=branch%3Amain) |
| [Test Data Management](https://endtoendtester.com/practices/test-data-management) | [`typescript/src/practices/test-data-management`](typescript/src/practices/test-data-management) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Test Driven Development](https://endtoendtester.com/practices/test-driven-development) | [`typescript/src/practices/test-driven-development`](typescript/src/practices/test-driven-development) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Test Naming](https://endtoendtester.com/practices/test-naming) | [`typescript/src/practices/test-naming`](typescript/src/practices/test-naming) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Writing Testable Code](https://endtoendtester.com/practices/writing-testable-code) | [`typescript/src/practices/writing-testable-code`](typescript/src/practices/writing-testable-code) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |

### quality

| Article | Sample | Language | CI |
|---|---|---|---|
| [Accessibility Testing](https://endtoendtester.com/quality/accessibility-testing) | [`typescript/src/quality/accessibility-testing`](typescript/src/quality/accessibility-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Authorization Testing](https://endtoendtester.com/quality/authorization-testing) | [`typescript/src/quality/authorization-testing`](typescript/src/quality/authorization-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Database Testing](https://endtoendtester.com/quality/database-testing) | [`typescript/src/quality/database-testing`](typescript/src/quality/database-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Load Testing](https://endtoendtester.com/quality/load-testing) | [`k6/quality/load-testing`](k6/quality/load-testing) | JavaScript (k6) | [quality-and-infra](https://github.com/8exgh/endtoendtester-samples/actions/workflows/quality-and-infra.yml?query=branch%3Amain) |
| [Performance Testing](https://endtoendtester.com/quality/performance-testing) | [`k6/quality/performance-testing`](k6/quality/performance-testing) | JavaScript (k6) | [quality-and-infra](https://github.com/8exgh/endtoendtester-samples/actions/workflows/quality-and-infra.yml?query=branch%3Amain) |
| [Security Testing](https://endtoendtester.com/quality/security-testing) | [`typescript/src/quality/security-testing`](typescript/src/quality/security-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |

### roles

| Article | Sample | Language | CI |
|---|---|---|---|
| [Quality Ownership](https://endtoendtester.com/roles/quality-ownership) | [`typescript/src/roles/quality-ownership`](typescript/src/roles/quality-ownership) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Sdet Vs Automation Tester Vs Manual Qa](https://endtoendtester.com/roles/sdet-vs-automation-tester-vs-manual-qa) | [`typescript/src/roles/sdet-vs-automation-tester-vs-manual-qa`](typescript/src/roles/sdet-vs-automation-tester-vs-manual-qa) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Shift Left Testing](https://endtoendtester.com/roles/shift-left-testing) | [`typescript/src/roles/shift-left-testing`](typescript/src/roles/shift-left-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Test Strategy](https://endtoendtester.com/roles/test-strategy) | [`typescript/src/roles/test-strategy`](typescript/src/roles/test-strategy) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |

### testing-levels

| Article | Sample | Language | CI |
|---|---|---|---|
| [Component Testing](https://endtoendtester.com/testing-levels/component-testing) | [`dotnet/Tests.Component/testing-levels/component-testing`](dotnet/Tests.Component/testing-levels/component-testing) | C# (WebApplicationFactory) | [dotnet](https://github.com/8exgh/endtoendtester-samples/actions/workflows/dotnet.yml?query=branch%3Amain) |
| [Component Testing](https://endtoendtester.com/testing-levels/component-testing) | [`typescript/src/testing-levels/component-testing`](typescript/src/testing-levels/component-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Contract Testing](https://endtoendtester.com/testing-levels/contract-testing) | [`java/src/test/java/testinglevels/contracttesting`](java/src/test/java/testinglevels/contracttesting) | Java | [java](https://github.com/8exgh/endtoendtester-samples/actions/workflows/java.yml?query=branch%3Amain) |
| [End To End Testing](https://endtoendtester.com/testing-levels/end-to-end-testing) | [`browser/tests/testing-levels/end-to-end-testing`](browser/tests/testing-levels/end-to-end-testing) | TypeScript (Playwright) | [browser](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml?query=branch%3Amain) |
| [Integration Testing](https://endtoendtester.com/testing-levels/integration-testing) | [`typescript/src/testing-levels/integration-testing`](typescript/src/testing-levels/integration-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Integration Testing With Stubs](https://endtoendtester.com/testing-levels/integration-testing-with-stubs) | [`typescript/src/testing-levels/integration-testing-with-stubs`](typescript/src/testing-levels/integration-testing-with-stubs) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Test Doubles](https://endtoendtester.com/testing-levels/test-doubles) | [`typescript/src/testing-levels/test-doubles`](typescript/src/testing-levels/test-doubles) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Testing Pyramid](https://endtoendtester.com/testing-levels/testing-pyramid) | [`typescript/src/testing-levels/testing-pyramid`](typescript/src/testing-levels/testing-pyramid) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Unit Testing](https://endtoendtester.com/testing-levels/unit-testing) | [`typescript/src/testing-levels/unit-testing`](typescript/src/testing-levels/unit-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Unit Testing With Mocks](https://endtoendtester.com/testing-levels/unit-testing-with-mocks) | [`typescript/src/testing-levels/unit-testing-with-mocks`](typescript/src/testing-levels/unit-testing-with-mocks) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Unit Testing Without Mocks](https://endtoendtester.com/testing-levels/unit-testing-without-mocks) | [`typescript/src/testing-levels/unit-testing-without-mocks`](typescript/src/testing-levels/unit-testing-without-mocks) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |

### tools

| Article | Sample | Language | CI |
|---|---|---|---|
| [Appium](https://endtoendtester.com/tools/appium) | [`reference/tools/appium`](reference/tools/appium) | reference only | — reference only |
| [Cypress](https://endtoendtester.com/tools/cypress) | [`cypress-samples/cypress/e2e/tools/cypress`](cypress-samples/cypress/e2e/tools/cypress) | JavaScript (Cypress) | [browser-tools](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser-tools.yml?query=branch%3Amain) |
| [Jest](https://endtoendtester.com/tools/jest) | [`typescript/src/tools/jest`](typescript/src/tools/jest) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Jest Mocking](https://endtoendtester.com/tools/jest-mocking) | [`typescript/src/tools/jest-mocking`](typescript/src/tools/jest-mocking) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Junit](https://endtoendtester.com/tools/junit) | [`java/src/test/java/tools/junit`](java/src/test/java/tools/junit) | Java | [java](https://github.com/8exgh/endtoendtester-samples/actions/workflows/java.yml?query=branch%3Amain) |
| [Mocking Frameworks](https://endtoendtester.com/tools/mocking-frameworks) | [`dotnet/Tests.XUnit/tools/mocking-frameworks`](dotnet/Tests.XUnit/tools/mocking-frameworks) | C# (NSubstitute) | [dotnet](https://github.com/8exgh/endtoendtester-samples/actions/workflows/dotnet.yml?query=branch%3Amain) |
| [Mocking Frameworks](https://endtoendtester.com/tools/mocking-frameworks) | [`typescript/src/tools/mocking-frameworks`](typescript/src/tools/mocking-frameworks) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Moq](https://endtoendtester.com/tools/moq) | [`dotnet/Tests.XUnit/tools/moq`](dotnet/Tests.XUnit/tools/moq) | C# | [dotnet](https://github.com/8exgh/endtoendtester-samples/actions/workflows/dotnet.yml?query=branch%3Amain) |
| [Mstest](https://endtoendtester.com/tools/mstest) | [`dotnet/Tests.MSTest/tools/mstest`](dotnet/Tests.MSTest/tools/mstest) | C# | [dotnet](https://github.com/8exgh/endtoendtester-samples/actions/workflows/dotnet.yml?query=branch%3Amain) |
| [Nunit](https://endtoendtester.com/tools/nunit) | [`dotnet/Tests.NUnit/tools/nunit`](dotnet/Tests.NUnit/tools/nunit) | C# | [dotnet](https://github.com/8exgh/endtoendtester-samples/actions/workflows/dotnet.yml?query=branch%3Amain) |
| [Playwright](https://endtoendtester.com/tools/playwright) | [`browser/tests/tools/playwright`](browser/tests/tools/playwright) | TypeScript (Playwright) | [browser](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser.yml?query=branch%3Amain) |
| [Pytest](https://endtoendtester.com/tools/pytest) | [`python/tests/tools/pytest`](python/tests/tools/pytest) | Python | [other-languages](https://github.com/8exgh/endtoendtester-samples/actions/workflows/other-languages.yml?query=branch%3Amain) |
| [Rspec](https://endtoendtester.com/tools/rspec) | [`ruby/spec/tools/rspec`](ruby/spec/tools/rspec) | Ruby | [other-languages](https://github.com/8exgh/endtoendtester-samples/actions/workflows/other-languages.yml?query=branch%3Amain) |
| [Selenium Webdriver](https://endtoendtester.com/tools/selenium-webdriver) | [`selenium/tests/tools/selenium-webdriver`](selenium/tests/tools/selenium-webdriver) | JavaScript (Selenium) | [browser-tools](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser-tools.yml?query=branch%3Amain) |
| [Testcontainers](https://endtoendtester.com/tools/testcontainers) | [`typescript/src/tools/testcontainers`](typescript/src/tools/testcontainers) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Vitest](https://endtoendtester.com/tools/vitest) | [`vitest/src/tools/vitest`](vitest/src/tools/vitest) | TypeScript (Vitest) | [browser-tools](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser-tools.yml?query=branch%3Amain) |
| [Wiremock](https://endtoendtester.com/tools/wiremock) | [`java/src/test/java/tools/wiremock`](java/src/test/java/tools/wiremock) | Java | [java](https://github.com/8exgh/endtoendtester-samples/actions/workflows/java.yml?query=branch%3Amain) |
| [Xunit](https://endtoendtester.com/tools/xunit) | [`dotnet/Tests.XUnit/tools/xunit`](dotnet/Tests.XUnit/tools/xunit) | C# | [dotnet](https://github.com/8exgh/endtoendtester-samples/actions/workflows/dotnet.yml?query=branch%3Amain) |

### web-frameworks

| Article | Sample | Language | CI |
|---|---|---|---|
| [Angular Testing](https://endtoendtester.com/web-frameworks/angular-testing) | [`angular/src/web-frameworks/angular-testing`](angular/src/web-frameworks/angular-testing) | TypeScript (Angular) | [flutter-angular-pipelines](https://github.com/8exgh/endtoendtester-samples/actions/workflows/flutter-angular-pipelines.yml?query=branch%3Amain) |
| [Dom Testing](https://endtoendtester.com/web-frameworks/dom-testing) | [`typescript/src/web-frameworks/dom-testing`](typescript/src/web-frameworks/dom-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Knockoutjs Testing](https://endtoendtester.com/web-frameworks/knockoutjs-testing) | [`typescript/src/web-frameworks/knockoutjs-testing`](typescript/src/web-frameworks/knockoutjs-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [React Testing](https://endtoendtester.com/web-frameworks/react-testing) | [`typescript/src/web-frameworks/react-testing`](typescript/src/web-frameworks/react-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Snapshot Testing](https://endtoendtester.com/web-frameworks/snapshot-testing) | [`typescript/src/web-frameworks/snapshot-testing`](typescript/src/web-frameworks/snapshot-testing) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Testing Library](https://endtoendtester.com/web-frameworks/testing-library) | [`typescript/src/web-frameworks/testing-library`](typescript/src/web-frameworks/testing-library) | TypeScript | [typescript](https://github.com/8exgh/endtoendtester-samples/actions/workflows/typescript.yml?query=branch%3Amain) |
| [Vuejs Testing](https://endtoendtester.com/web-frameworks/vuejs-testing) | [`vitest/src/web-frameworks/vuejs-testing`](vitest/src/web-frameworks/vuejs-testing) | TypeScript (Vitest) | [browser-tools](https://github.com/8exgh/endtoendtester-samples/actions/workflows/browser-tools.yml?query=branch%3Amain) |

## Reference-only samples

Four need hardware or a licensed platform a Linux runner does not have, so
they are written to be copied rather than stubbed into something that would
pass while proving nothing. See [reference/README.md](reference/README.md) —
two of the four have a runnable counterpart elsewhere in this repository.

## How this is kept honest

- `tools/build-manifest.mjs` rebuilds `samples.json` and **fails** if a
  sample points at an article that does not exist. It also reports any
  article with no sample.
- `tools/generate-readmes.mjs` writes all 87 sample READMEs
  from that manifest, so no link is maintained by hand.
- `tools/validate_pipelines.py` parses the four CI platform configs and
  asserts each still carries the property its article is about.
- `typescript/src/practices/test-naming` lints every test name in the
  TypeScript workspace, and `roles/quality-ownership` fails the build for a
  module with no test beside it and no written reason why.

---

Part of [endtoendtester.com](https://endtoendtester.com).
