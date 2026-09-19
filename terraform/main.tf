# An ephemeral test environment as code — and, more usefully here, the
# validation rules that stop one from leaking.
# https://endtoendtester.com/ci-cd/terraform-test-infrastructure
#
# No provider is configured: `terraform test` runs these against plans, so
# the sample verifies the module's own logic without creating anything or
# needing cloud credentials.

terraform {
  required_version = ">= 1.6"
}

variable "branch" {
  description = "The branch this environment belongs to. Becomes part of DNS and resource names."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{1,32}$", var.branch))
    error_message = "branch must be lowercase alphanumeric with hyphens, 32 characters or fewer."
  }
}

variable "ttl_hours" {
  description = "How long before the reaper is allowed to destroy this environment."
  type        = number
  default     = 8

  validation {
    condition     = var.ttl_hours > 0 && var.ttl_hours <= 72
    error_message = "ttl_hours must be between 1 and 72: an environment that never expires is one that never gets cleaned up."
  }
}

variable "engine_version" {
  description = "Pinned to the version production runs. A test environment on a different major is a fake with a drift problem."
  type        = string
  default     = "16.4"
}

locals {
  name = "test-${var.branch}"

  # Every resource carries these. The reaper reads expires_at, finance
  # reads cost_centre, a human reads branch.
  tags = {
    environment = "test"
    branch      = var.branch
    managed_by  = "terraform"
    expires_at  = timeadd(timestamp(), "${var.ttl_hours}h")
    cost_centre = "engineering"
  }
}

output "name" {
  description = "The namespaced environment name every resource derives from."
  value       = local.name
}

output "tags" {
  description = "The tag set applied to every resource in this environment."
  value       = local.tags
}

output "engine_version" {
  value = var.engine_version
}
