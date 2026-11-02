variable "aws_region" {
  description = "AWS region for the isolated migration environment."
  type        = string
}

variable "environment" {
  description = "Environment prefix used for every resource name."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,20}$", var.environment))
    error_message = "Use lowercase letters, digits, and hyphens, starting with a letter (maximum 21 characters)."
  }
}

variable "google_oauth_enabled" {
  description = "Enable after storing GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the Google secret."
  type        = bool
  default     = false
}

variable "open_group_creation" {
  description = "Allow every signed-in user to create groups; set false to require an admin grant."
  type        = bool
  default     = true
}
