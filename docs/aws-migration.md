# AWS migration

The runtime now uses DynamoDB instead of SQLx/PostgreSQL. Rust, Axum, async-graphql, the GraphQL contract, Vietnamese UI, integer VND calculations, Google OIDC verification, server authorization, optimistic versions and public email redaction remain in place. Terraform manages Lambda ARM64, API Gateway HTTP API, a private S3 frontend bucket, CloudFront, Secrets Manager, logs, alarms and a protected DynamoDB table with point-in-time recovery.

## Storage and consistency

Logical heads use `pk` as a record kind (`GROUP`, `LINK`, `USER`, `SUBJECT`, `SESSION`, `OAUTH`, `ROLE`, `AUDIT`, `ROLE_AUDIT`) and `sk` as the record ID. A head points to immutable JSON chunks under `BLOB#<random revision>`. Each chunk is at most 300,000 bytes, leaving room below DynamoDB's item limit. JSON integer VND values deserialize into Rust i64; money never passes through floating point arithmetic.

A write stages all chunks before a DynamoDB transaction conditionally replaces the head. Group head, audit head and any new link head commit together. A crash during staging leaves unreachable chunks; readers only follow committed heads. Old chunks remain available for audit and recovery. There is no automatic orphan garbage collector: this implementation intentionally retains staged and historical chunks. Repeated updates to large groups increase storage and write cost; measure this before heavy use.

The group head contains members and ledger entries, alias membership, an entry-order counter and the optimistic group version. Groups and audit snapshots can span many chunks without increasing the number of transactional actions. A link lookup must also match the current group's canonical token or alias list. Rotation clears that list in the same group commit, revoking every old link even though historical link records are retained.

All commits also increment a shared revision item. Group-list/dashboard reads compare that stamp before and after paginated, strongly consistent reads and retry at most five times. This gives a consistent cross-group view or an explicit conflict. It introduces a shared write bottleneck and causes retries under sustained writes. Snapshot reads and writes grow with group size; this design suits the current small-group application, not an unlimited high-throughput ledger. API Gateway/Lambda response limits and the Lambda timeout still bound HTTP responses even though storage supports larger snapshots.

Sessions and OAuth heads/chunks carry TTL timestamps, but application code checks expiry before reading payloads; delayed TTL deletion never authorizes an expired session. OAuth consumption uses a revision condition, so one callback wins. Google subject and user/session updates commit atomically. Roles are read on each authenticated request, and role updates and audit events commit together.

AWS references: [transactions and isolation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html), [managed cache policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html), [origin request policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html).

## Local verification

```sh
cp .env.example .env
npm ci
docker compose up -d --build
npm test
npm run build
cargo fmt --check --manifest-path apps/api/Cargo.toml
cargo test --manifest-path apps/api/Cargo.toml
npm run test:integration:local
```

Compose initializes a disposable DynamoDB Local table. The integration runner imports trusted session fixtures using the command-line migration tool; there is no test login endpoint. Test data remains in this local database; remove its volume when done. Never point fixture imports at production. The runner's optional `LOCAL_API_BINARY` supports a directly running local API.

Additional Rust storage/import tests require a disposable table and use `cargo test --manifest-path apps/api/Cargo.toml --features lambda -- --include-ignored` with `DYNAMODB_TABLE`, `DYNAMODB_ENDPOINT`, `AWS_REGION` and local dummy credentials. These exercise large snapshots, competing commits, expired sessions, role revocation, repeatable import, audit preservation and legacy-link rotation.

## Deploy

See [Terraform instructions](../infra/terraform/README.md). The selected deployment starts with an empty database; no PostgreSQL source was supplied. The live Sydney deployment has its OAuth credentials in Secrets Manager and `google_oauth_enabled=true`. For a new environment, populate its secret before enabling this setting. The login callback must be registered in Google Cloud at `<web_url>/auth/google/callback`.

## Optional PostgreSQL import

Freeze all source writes, retain a source backup, and export one repeatable-read snapshot. The SQL export includes groups, members, expenses, shares, settlements, aliases, users, sessions, role grants, role history, activity history and legacy admin audit identities. Protect the export as sensitive data and do not commit it:

```sh
umask 077
psql "$DATABASE_URL" -qAt -v ON_ERROR_STOP=1 -f scripts/export-postgres.sql > /private/tmp/tingting-export.json
DYNAMODB_TABLE=<isolated-table> AWS_PROFILE=thao-dev AWS_REGION=ap-southeast-2 \
  apps/api/target/debug/tingting-api --import /private/tmp/tingting-export.json
DYNAMODB_TABLE=<isolated-table> AWS_PROFILE=thao-dev AWS_REGION=ap-southeast-2 \
  apps/api/target/debug/tingting-api --verify-import /private/tmp/tingting-export.json
```

The importer preserves stable IDs, versions, canonical/legacy links, entry ordering, integer amounts and raw historical records. It refuses to overwrite mismatching target records. Identical imports can be resumed; verification compares normalized records and the retained source archive. Expired sessions and unfinished OAuth attempts are not restored. Revalidate balances and permissions in an isolated rehearsal before redirecting traffic. Cookie domain changes require users to sign in again.

Keep writes frozen until validation finishes. Before AWS accepts new writes, rollback can restore the original deployment and database. After AWS accepts writes, returning to PostgreSQL requires a separately tested reverse migration; do not direct traffic to the stale source database.

## Recovery

Restore DynamoDB point-in-time recovery to a new table, inspect its committed group heads and every referenced chunk, run domain/balance and authorization checks, then update the Lambda table environment variable through Terraform. AWS notes that a restore can capture a transaction during propagation: test cross-record consistency before accepting traffic. Rehearse restoration in an isolated environment before production use. Reapply TTL, deletion protection and access policies to a restored table. S3 frontend objects are versioned; redeploy a prior verified build for UI rollback. Alarm delivery requires a confirmed subscription to the Terraform SNS output.
