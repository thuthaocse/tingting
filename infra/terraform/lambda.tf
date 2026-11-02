variable "api_package" {
  description = "Path to a DynamoDB-compatible Linux ARM64 bootstrap ZIP. Null provisions the foundation only."
  type        = string
  default     = null
}

variable "web_origin" {
  description = "Public HTTPS origin used for OAuth redirects and origin validation."
  type        = string
  default     = null
}

resource "aws_cloudwatch_log_group" "api" {
  count             = var.api_package == null ? 0 : 1
  name              = "/aws/lambda/${local.name_prefix}"
  retention_in_days = 30
}

resource "aws_iam_role" "api" {
  count = var.api_package == null ? 0 : 1
  name  = "${local.name_prefix}-api"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "api" {
  count = var.api_package == null ? 0 : 1
  role  = aws_iam_role.api[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:TransactGetItems", "dynamodb:TransactWriteItems"]
        Resource = aws_dynamodb_table.application.arn
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.google.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.api[0].arn}:*"
      }
    ]
  })
}

resource "aws_lambda_function" "api" {
  count            = var.api_package == null ? 0 : 1
  function_name    = local.name_prefix
  role             = aws_iam_role.api[0].arn
  filename         = var.api_package
  source_code_hash = filebase64sha256(var.api_package)
  runtime          = "provided.al2023"
  handler          = "bootstrap"
  architectures    = ["arm64"]
  timeout          = 30
  memory_size      = 512
  environment {
    variables = {
      DYNAMODB_TABLE      = aws_dynamodb_table.application.name
      WEB_ORIGIN          = coalesce(var.web_origin, local.public_origin)
      COOKIE_SECURE       = "true"
      OPEN_GROUP_CREATION = tostring(var.open_group_creation)
      GOOGLE_SECRET_ARN   = var.google_oauth_enabled ? aws_secretsmanager_secret.google.arn : ""
    }
  }
  lifecycle {
    precondition {
      condition     = var.web_origin == null || can(regex("^https://[^/]+$", var.web_origin))
      error_message = "Provide the public HTTPS web_origin before creating the API."
    }
  }
  depends_on = [aws_iam_role_policy.api, aws_cloudfront_distribution.web]
}
