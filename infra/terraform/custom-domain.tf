variable "custom_domain" {
  description = "Optional public hostname for the existing CloudFront distribution."
  type        = string
  default     = null

  validation {
    condition     = var.custom_domain == null || can(regex("^[a-z0-9][a-z0-9.-]*\\.[a-z]{2,}$", var.custom_domain))
    error_message = "Use a lowercase DNS hostname without a scheme or path."
  }
}

variable "activate_custom_domain" {
  description = "Activate after certificate DNS validation and the hostname CNAME have been configured."
  type        = bool
  default     = false
}

variable "redirect_to_custom_domain" {
  description = "Redirect old frontend URLs only after the custom hostname is serving HTTPS."
  type        = bool
  default     = false
}

provider "aws" {
  alias  = "certificate"
  region = "us-east-1"
}

resource "aws_acm_certificate" "web" {
  count             = var.custom_domain == null ? 0 : 1
  provider          = aws.certificate
  domain_name       = var.custom_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "web" {
  count                   = var.activate_custom_domain && var.custom_domain != null ? 1 : 0
  provider                = aws.certificate
  certificate_arn         = aws_acm_certificate.web[0].arn
  validation_record_fqdns = [for record in aws_acm_certificate.web[0].domain_validation_options : record.resource_record_name]
}

locals {
  canonical_domain = var.activate_custom_domain ? var.custom_domain : null
  public_origin    = local.canonical_domain == null ? "https://${aws_cloudfront_distribution.web.domain_name}" : "https://${local.canonical_domain}"
}

output "certificate_dns_records" {
  description = "Add these public certificate-validation CNAMEs at your DNS provider."
  value = var.custom_domain == null ? [] : [for record in aws_acm_certificate.web[0].domain_validation_options : {
    name  = record.resource_record_name
    type  = record.resource_record_type
    value = record.resource_record_value
  }]
}

output "frontend_dns_target" {
  value = aws_cloudfront_distribution.web.domain_name
}
