variable "resource_name_prefix" {
  description = "Optional existing resource prefix to preserve deployed resource identities."
  type        = string
  default     = null

  validation {
    condition     = var.resource_name_prefix == null || can(regex("^[a-z][a-z0-9-]{0,40}$", var.resource_name_prefix))
    error_message = "Use lowercase letters, digits and hyphens for the resource prefix."
  }
}

locals {
  name_prefix = coalesce(var.resource_name_prefix, "${var.environment}-tingting")
}
