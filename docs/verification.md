# Verification

## Business rules to verify

- Select a name from the member list managed by an admin; the device remembers the selection for each group.
- Guests with a group link have read-only access. Users signed in with Google can view all groups and edit transactions. Admins can create and manage groups and members. Users with the creator role can create groups but have no administrative privileges. thuthao.cse@gmail.com is the root admin; admins can grant or revoke roles by Google account email.
- An expense has one payer and at least one participant sharing the cost. The payer does not have to participate in the split.
- By default, split equally among all members. Allocate remaining one-dong units in ascending UUID order.
- Balance = expenses paid − allocated shares + payments sent − payments received.
- Direct debts are offset within each pair; simplification uses net balances across the entire group.
- With simplification enabled, a member generally either pays or receives according to their net balance. With it disabled, both can appear. Both modes always preserve each member's balance.
- Recording a payment does not transfer real money. Partial payments and actual payments larger than the suggestion are allowed; any excess creates a balance in the opposite direction.
- Editing or deleting a transaction recalculates all balances. Debt repayments do not count toward total expenses.
- Members referenced by transactions cannot be deleted. Archived groups are read-only, but admins can reopen them.
- Rotating a link invalidates the old link. Google accounts are linked to members by verified email; selecting a name only changes the viewing perspective.
- Activity is sorted by transaction date, newest first. Within a date, the most recently entered transaction comes first, using a shared counter for expenses and payments. Editing a transaction does not change this counter; UUIDs do not determine the order.
- Group links use random 16-character codes. Older, longer links continue working after shortening. When an admin explicitly rotates a link, both the current link and all older links for that group are invalidated.
- Home totals payable and receivable use simplified debts from active groups, without offsetting across groups. Expand each section to see the corresponding people and groups.
- If an email matches no member or multiple members, show an unlinked state rather than claiming that all debts are settled. Only admins can update member emails.

## Recorded verification results

Delegated roles and navigation update:

- 12 frontend/unit/render tests pass, including internal route selection, native handling for OAuth/external links and modified clicks, creator-only create action, and settings placement outside the header.
- Three GraphQL/PostgreSQL integration workflows pass, including grant normalization, creator creation without admin privileges, escalation rejection, admin upgrade, immediate permission revocation and root-admin protection.
- Seven Rust unit tests pass; role migration 0006 and the Docker production build pass. Sample home groups show 200,000 VND payable and 600,000 VND receivable for the root admin, from explicitly labeled sample transactions.
- CSS changes address read-only debt columns, card stretching, single-line ellipsis titles, compact tab content, left-aligned totals note and greeting emphasis. Browser screenshot verification remains pending.
