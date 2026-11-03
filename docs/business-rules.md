# Business rules

- Select a name from the member list managed by an admin; the device remembers the selection for each group.
- Guests with a group link have read-only access. Signed-in group lists include only groups whose roster has one unique match for the verified Google email; signed-in users can edit transactions through a group link. Every signed-in account can create groups and appears in account management. Admins also manage groups, members, and roles. The root admin is thuthao.cse@gmail.com. Revoking an explicit role returns a signed-in account to creator access.
- An expense has one payer and at least one participant sharing the cost. The payer does not have to participate in the split.
- By default, split equally among all members. Allocate remaining one-dong units in ascending UUID order.
- Balance = expenses paid − allocated shares + payments sent − payments received.
- Direct debts are offset within each pair; simplification uses net balances across the entire group.
- With simplification enabled, a member generally either pays or receives according to their net balance. With it disabled, both can appear. Both modes always preserve each member's balance.
- Recording a payment does not transfer real money. Partial payments and actual payments larger than the suggestion are allowed; any excess creates a balance in the opposite direction.
- Editing or deleting a transaction recalculates all balances. Debt repayments do not count toward total expenses.
- Members referenced by transactions cannot be deleted.
- Rotating a link invalidates the old link. Google accounts are linked to members by verified email; selecting a name only changes the viewing perspective.
- Activity is sorted by transaction date, newest first. Within a date, the most recently entered transaction comes first, using a shared counter for expenses and payments. Editing a transaction does not change this counter; UUIDs do not determine the order.
- Group links use random 16-character codes. Older, longer links continue working after shortening. When an admin explicitly rotates a link, both the current link and all older links for that group are invalidated.
- Home totals payable and receivable use simplified debts from matching groups, without offsetting across groups. Expand each section to see the corresponding people and groups.
- If an email matches no member or multiple members, show an unlinked state rather than claiming that all debts are settled. Only admins can update member emails.
- A signed-in user sees only teams whose roster contains their email. The team creator manages the team roster; group creation can include all or selected team members.
