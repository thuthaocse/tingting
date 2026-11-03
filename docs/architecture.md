# Architecture

React SPA → same-origin POST /graphql → Axum / async-graphql → services → pure Rust domain → DynamoDB conditional heads → immutable snapshot chunks.

The SPA is built with Vite and TypeScript. Adjacent component CSS Modules isolate styles; @tingting/design-system owns tokens and primitive components. Screen and form components live in feature folders; the shared application lifecycle is owned by app/hooks/useTingting.ts.

## Permissions

Google OpenID Connect uses a server-side authorization-code flow with PKCE, nonce and a browser-bound, one-use state expiring after 10 minutes. The openidconnect library verifies the ID token signature, issuer, audience, expiry and nonce. Only verified emails are accepted. Google subject identifies the account; email is refreshed at login. Client secrets and code exchange stay on the API. Access/refresh tokens are not stored.

Users and hashed seven-day sessions live in users/user_sessions. Cookies are HttpOnly and SameSite=Lax, with Secure in production. OAuth callback query strings are excluded from request spans. Password login and bootstrap have been removed; migration 0005 invalidates old password sessions. Old admin rows remain solely for historical audit references.

The verified email thuthao.cse@gmail.com is the immutable root admin. Admins can grant admin or creator roles by normalized email, before or after first login. The API checks explicit grants on every authenticated request. Every signed-in account has creator access and appears in account management. Revoking an explicit grant restores the default creator role without ending the session. Admins manage groups, members, links and role grants; creators can create groups but have no administrative management permission. Role changes are serialized per email and recorded in role_grant_events. The signed-in group list only includes groups with one unique roster email matching the verified account email. A direct group link remains readable by guests; every write requires Google authentication. Member emails are nulled in non-admin responses. Dropdown identity is a local view preference; audit events record the actual signed-in user separately from the entered payer/recipient.

Home summaries match the verified account email to a unique roster email, normalized by trimming and case folding. Names and local dropdown choices never claim membership. Duplicate roster emails are rejected on create/update; ambiguous historical matches remain unlinked. Dashboard totals sum simplified debts across matching groups, without cancelling debts between groups. A shared revision stamp around strongly consistent paginated reads keeps dashboard details and totals consistent.

Teams are stored as versioned DynamoDB snapshots with a separate append-only audit record for each create or update. A team is listed only when its member roster contains the signed-in account email. The team creator manages its name and member roster; each member is added by name and email. Group creation can copy an entire team roster or selected members into the group, after which group members are managed independently.

Public links use random 16-character URL-safe codes. Rotating a link revokes its historical aliases.

## Consistency and persistence

The group is the transaction boundary. Commands check the optimistic version, stage immutable snapshot chunks, then atomically replace the group head with a revision condition and append an audit reference. No child records are deleted. A canonical or legacy link must also match the current group's canonical token or alias set. See [AWS storage and scaling tradeoffs](aws-migration.md).

A client-generated expense/settlement UUID is retained while retrying an operation; upsert by this UUID plus a version check prevents duplicate financial entries. The UI also disables duplicate submits. On conflict, fresh data is loaded and the user's form remains available for review. No automatic retry that might silently overwrite changes.

GraphQL exposes a custom Money scalar (integer JSON numbers) rather than the 32-bit Int scalar. Amounts use Rust i64 / DynamoDB JSON snapshot integers and JavaScript safe integers, bounded per transaction. Backend derives direct and simplified debt suggestions. The UI uses the same mode for personal and group balances. Simplification uses deterministic largest-balance matching; it does not guarantee the mathematical minimum count of transfers.

## API

Queries: accessGrants (admin), me, googleLoginEnabled, groups (signed in), dashboard (signed in), group(token), balances(token), debts(token,simplified).
Mutations: setAccessGrant (admin), logout, createGroup/updateGroup, saveExpense/deleteExpense, saveSettlement/deleteSettlement, rotateLink.
Inputs are typed GraphQL objects. Schema limits: 12 levels, complexity 1000, request body 256KiB. No cross-origin CORS permissions; Origin header is checked against WEB_ORIGIN. The development Vite proxy preserves the browser session.

## Deployment

Terraform provisions Lambda, API Gateway, a private S3 frontend, CloudFront same-origin routing, Secrets Manager, logs, alarms and DynamoDB with point-in-time recovery and deletion protection. Local Compose uses DynamoDB Local. See [deployment instructions](../infra/terraform/README.md).

## Deferred

Email delivery, unequal splits, multiple payers, multiple currencies, subscriptions, mathematical minimum-transfer optimization. The coding-principles skill was imported from the local lanh-ai checkout; see .agents/skills/README.md.

## Activity order

Expenses and settlements carry immutable createdOrder values from a monotonically increasing group counter (imported entries retain their original sequence values). The API exposes them as strings to preserve integer precision. Activity groups by transaction date, then compares creation order with BigInt. Existing data is backfilled from the earliest save audit event. Snapshot updates preserve these values.

Imported legacy links are stored as LINK records and in the group alias set. Opening a legacy URL resolves the same group and updates the browser to its canonical short URL. Explicit link rotation removes all aliases so previously shared URLs stop working. Internal UUIDs and member identity keys remain stable.

## Client navigation

Same-origin home, group and design-system links use History API pushState and popstate rather than document navigation. Modified clicks and external/OAuth links keep browser behavior. Group loads carry a monotonically increasing request ID to prevent a slow response from a previous route replacing the current group. Settings and sharing live alongside the group heading, outside the account header.
