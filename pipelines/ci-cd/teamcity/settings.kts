// https://endtoendtester.com/ci-cd/teamcity
//
// Configuration in version control, reviewed like code. TeamCity can export
// existing UI configuration to Kotlin, which is the usual way in.
import jetbrains.buildServer.configs.kotlin.*
import jetbrains.buildServer.configs.kotlin.buildFeatures.parallelTests
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.triggers.vcs

version = "2024.12"

project {
    buildType(Build)
    buildType(UnitTests)
    buildType(E2ETests)

    // A chain: Build runs once, the test configurations consume its output
    // in parallel. Re-running one test configuration does not rebuild, and
    // each keeps its own history and flakiness profile.
    sequential {
        buildType(Build)
        parallel {
            buildType(UnitTests)
            buildType(E2ETests)
        }
    }
}

object Build : BuildType({
    name = "Build"
    vcs { root(DslContext.settingsRoot) }
    steps {
        script {
            name = "Install and typecheck"
            scriptContent = """
                cd typescript
                npm ci
                npm run typecheck
            """.trimIndent()
        }
    }
    triggers { vcs { } }
})

object UnitTests : BuildType({
    name = "Unit tests"
    dependencies { snapshot(Build) { } }
    steps {
        script {
            name = "Jest"
            // Service messages are plain stdout lines, so any tool in any
            // language can report structured results with no plugin:
            //   ##teamcity[testFailed name='...' message='...']
            scriptContent = "cd typescript && npm ci && npm run test:unit -- --ci"
        }
    }
})

object E2ETests : BuildType({
    name = "E2E tests"
    dependencies { snapshot(Build) { } }
    steps {
        script {
            scriptContent = """
                cd browser
                npm ci
                npx playwright install --with-deps chromium
                npx playwright test --project=chromium --reporter=junit
            """.trimIndent()
        }
    }
    features {
        // Splits by historical test duration rather than by file count,
        // which produces far more even batches than most platforms manage.
        parallelTests { numberOfBatches = 4 }
    }
    artifactRules = "browser/playwright-report/** => playwright-report.zip"
})
