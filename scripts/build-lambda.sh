#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build/lambda
# Build inside Amazon Linux so the artifact matches the Lambda runtime.
docker run --rm --platform linux/arm64 -v "$PWD:/app" -w /app public.ecr.aws/sam/build-provided.al2023:latest-arm64 /bin/bash -c '
  curl --proto "=https" --tlsv1.2 -fsSL https://sh.rustup.rs -o /tmp/rustup.sh
  sh /tmp/rustup.sh -y --profile minimal --default-toolchain 1.99.1
  source "$HOME/.cargo/env"
  cargo build --release --locked --features lambda --manifest-path apps/api/Cargo.toml --target aarch64-unknown-linux-gnu
  cp apps/api/target/aarch64-unknown-linux-gnu/release/tingting-api build/lambda/bootstrap
'
(cd build/lambda && zip -j ../api.zip bootstrap)
