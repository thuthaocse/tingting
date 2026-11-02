FROM rust:1.99.1-slim-trixie AS build
WORKDIR /app
COPY apps/api ./apps/api
COPY migrations ./migrations
WORKDIR /app/apps/api
RUN cargo build --release --locked
FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* && useradd --system lilac
COPY --from=build /app/apps/api/target/release/lilac-api /usr/local/bin/lilac-api
USER lilac
EXPOSE 8080
CMD ["lilac-api"]
