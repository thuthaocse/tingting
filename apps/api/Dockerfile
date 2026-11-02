FROM rust:1.99.1-slim-trixie AS build
WORKDIR /app
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN cargo build --release --locked
FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* && useradd --system tingting
COPY --from=build /app/apps/api/target/release/tingting-api /usr/local/bin/tingting-api
USER tingting
EXPOSE 8080
CMD ["tingting-api"]
