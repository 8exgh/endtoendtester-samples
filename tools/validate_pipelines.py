#!/usr/bin/env python3
"""Check the CI platform samples are still valid and still say what the
articles claim they say.

These four configurations cannot be executed here — they belong to other
platforms — so the next best thing is to parse them and assert the
properties that make them worth copying. A reference config nobody checks
rots exactly like a comment nobody checks.

https://endtoendtester.com/ci-cd/azure-devops-pipelines
https://endtoendtester.com/ci-cd/bitbucket-pipelines
https://endtoendtester.com/ci-cd/jenkins
https://endtoendtester.com/ci-cd/teamcity
"""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
PIPELINES = ROOT / "pipelines" / "ci-cd"

problems: list[str] = []


def check(condition: bool, message: str) -> None:
    if not condition:
        problems.append(message)


def load_yaml(path: Path):
    try:
        return yaml.safe_load(path.read_text())
    except yaml.YAMLError as error:  # noqa: BLE001 - the message is the point
        problems.append(f"{path.relative_to(ROOT)} is not valid YAML: {error}")
        return None


def walk(node):
    """Every mapping anywhere in the document."""
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from walk(value)
    elif isinstance(node, list):
        for item in node:
            yield from walk(item)


# ---- Azure DevOps ---------------------------------------------------
azure_path = PIPELINES / "azure-devops-pipelines" / "azure-pipelines.yml"
azure = load_yaml(azure_path)
if azure is not None:
    check("stages" in azure, "azure: no stages — the sample is meant to show a staged pipeline")

    publishers = [n for n in walk(azure) if str(n.get("task", "")).startswith("PublishTestResults")]
    check(bool(publishers), "azure: nothing publishes test results, which is the reason to use this platform")
    check(
        all(str(p.get("condition", "")).strip() == "always()" for p in publishers),
        "azure: a results publisher without condition: always() hides the report exactly when it is needed",
    )

    parallel = [n for n in walk(azure) if isinstance(n.get("strategy"), dict) and "parallel" in n["strategy"]]
    check(bool(parallel), "azure: no job uses strategy.parallel, so the sharding half is missing")


# ---- Bitbucket ------------------------------------------------------
bitbucket_path = PIPELINES / "bitbucket-pipelines" / "bitbucket-pipelines.yml"
bitbucket = load_yaml(bitbucket_path)
if bitbucket is not None:
    check("pipelines" in bitbucket, "bitbucket: no pipelines block")

    browser_steps = [
        n for n in walk(bitbucket)
        if "playwright" in str(n.get("script", "")).lower() or "playwright" in str(n.get("name", "")).lower()
    ]
    check(bool(browser_steps), "bitbucket: no browser step to check")
    check(
        all(str(step.get("size", "")) == "2x" for step in browser_steps if "size" in step or "playwright" in str(step.get("script", "")).lower()),
        "bitbucket: a browser step without size: 2x runs Chromium in 4GB, and the OOM kill reads like a flaky test",
    )


# ---- Jenkins --------------------------------------------------------
jenkinsfile = (PIPELINES / "jenkins" / "Jenkinsfile").read_text()
check("pipeline {" in jenkinsfile, "jenkins: not a declarative pipeline")
check("--ipc=host" in jenkinsfile, "jenkins: a Chromium container without --ipc=host crashes under parallel load")
check("/var/run/docker.sock" in jenkinsfile, "jenkins: Testcontainers needs a docker socket mounted")
check("junit " in jenkinsfile or "junit(" in jenkinsfile, "jenkins: nothing publishes JUnit results")
check("always {" in jenkinsfile, "jenkins: results published without an always block are lost on failure")


# ---- TeamCity -------------------------------------------------------
settings = (PIPELINES / "teamcity" / "settings.kts").read_text()
check("version = " in settings, "teamcity: the DSL version is not declared")
check("parallelTests" in settings, "teamcity: the duration-based test split is the feature worth showing")
check("snapshot(Build)" in settings, "teamcity: the build chain is the model; without a snapshot dependency there is no chain")


# ---- Report ---------------------------------------------------------
files = [azure_path, bitbucket_path, PIPELINES / "jenkins" / "Jenkinsfile", PIPELINES / "teamcity" / "settings.kts"]
print(f"\n  checked {len(files)} pipeline samples:")
for path in files:
    print(f"    {path.relative_to(ROOT)}")

if problems:
    print()
    for problem in problems:
        print(f"  ✗ {problem}", file=sys.stderr)
    sys.exit(1)

print("\n  ✓ All four parse, and each still carries the property its article is about.\n")
