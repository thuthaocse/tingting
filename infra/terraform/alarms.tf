resource "aws_sns_topic" "operations" {
  name = "${local.name_prefix}-operations"
}
resource "aws_cloudwatch_metric_alarm" "lambda" {
  for_each            = var.api_package == null ? toset([]) : toset(["Errors", "Throttles"])
  alarm_name          = "${local.name_prefix}-${lower(each.value)}"
  namespace           = "AWS/Lambda"
  metric_name         = each.value
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  dimensions          = { FunctionName = aws_lambda_function.api[0].function_name }
  alarm_actions       = [aws_sns_topic.operations.arn]
}
output "operations_topic_arn" { value = aws_sns_topic.operations.arn }
