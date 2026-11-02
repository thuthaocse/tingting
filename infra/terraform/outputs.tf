output "application_table_name" {
  description = "DynamoDB table reserved for the migration."
  value       = aws_dynamodb_table.application.name
}

output "application_table_arn" {
  description = "ARN of the table reserved for the migration."
  value       = aws_dynamodb_table.application.arn
}
