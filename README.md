# Tingting

Tingting is a group expense-sharing app that helps people track shared expenses, see who owes whom, and record payments. It supports group links, Google sign-in, and balances calculated in Vietnamese đồng (VND).

## AWS

Backend dùng DynamoDB và chạy trên Lambda ARM64. Terraform cấu hình API Gateway, S3/CloudFront cùng origin, Secrets Manager, log và cảnh báo. Xem [hướng dẫn triển khai](infra/terraform/README.md) và [thiết kế lưu trữ, chuyển dữ liệu và khôi phục](docs/aws-migration.md).

Bản AWS đang chạy tại [Tingting](https://tingting.thaotrinh.site), region Sydney (`ap-southeast-2`). Xem [trạng thái triển khai](docs/aws-deployment-status.md).
