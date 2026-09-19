# `terraform test`, built in since 1.6. These run against a plan, in
# seconds, and create nothing.
# https://endtoendtester.com/ci-cd/terraform-test-infrastructure

variables {
  branch = "feature-checkout"
}

run "resources_are_namespaced_by_branch" {
  command = plan

  assert {
    condition     = output.name == "test-feature-checkout"
    error_message = "the environment name must include the branch, or two branches collide"
  }
}

run "every_resource_is_tagged_for_the_reaper_and_for_finance" {
  command = plan

  assert {
    condition     = output.tags["environment"] == "test"
    error_message = "the reaper finds environments by the environment tag"
  }

  assert {
    condition     = output.tags["branch"] == "feature-checkout"
    error_message = "a human needs to know which branch an orphan belongs to"
  }

  assert {
    condition     = can(output.tags["expires_at"])
    error_message = "without expires_at nothing can ever be reaped automatically"
  }
}

run "the_engine_version_is_pinned_to_production" {
  command = plan

  assert {
    condition     = output.engine_version == "16.4"
    error_message = "a test database on a different major version is a fake with a drift problem"
  }
}

run "rejects_a_branch_name_that_is_not_safe_in_dns" {
  command = plan

  variables {
    branch = "Feature/Checkout"
  }

  expect_failures = [var.branch]
}

run "rejects_a_branch_name_that_is_too_long" {
  command = plan

  variables {
    branch = "a-very-long-branch-name-that-goes-well-past-the-limit"
  }

  expect_failures = [var.branch]
}

run "rejects_an_environment_that_would_never_expire" {
  command = plan

  variables {
    ttl_hours = 0
  }

  expect_failures = [var.ttl_hours]
}

run "rejects_a_ttl_longer_than_three_days" {
  command = plan

  variables {
    ttl_hours = 200
  }

  expect_failures = [var.ttl_hours]
}
