# Comment discipline

Default to no comments. A well-named identifier explains WHAT (see
[`naming-conventions`](naming-conventions.md)); a comment earns its place only when the WHY is
genuinely non-obvious. Comments are the one part of the code nothing executes and no test pins, so
every one of them is a claim that can silently go stale — write few, make each one load-bearing, and
put long rationale where it is maintained.

## Allowlist — correct regardless of length

A comment earns its keep when it is one of these. Everything else defaults to nothing.

1. **An invariant the type system cannot express.** "Only the head of each channel partition is
   claimable — a higher-priority sibling waits behind the in-flight item, never runs beside it."
1. **A constraint imposed by an external system.** A Slack or Lark API's actual behaviour versus its
   documentation, a Postgres isolation rule the query depends on, a browser quirk.
1. **A magic number's derivation.** A lease length, a cap, a budget share — the number is
   meaningless without the measurement or arithmetic behind it.
1. **A workaround**, pointing at the issue, pull request, or record that justifies it — not merely
   asserted.
1. **In tests: why the test exists** — which regression or decision it guards — when the test name
   does not already say so.

## Where the comment lives

This codebase carries its rationale at the top of things, and reads well because of it: a module
docstring or header block states the design once (`ingest/queue.py`, `dashboard/wire.ts`), and a
constant's leading comment explains the value it introduces. Inside a function body the opposite
holds — a paragraph there breaks the reading flow that
[`function-organization`](function-organization.md) protects.

- **Module docstrings and header blocks** (the first comment in a file, or the block directly above
  a module-level constant, type, or function): allowlist items at whatever length they need. This is
  where a design that spans several functions is explained, once.
- **Inline comments inside a function body:** one to three lines. If the WHY needs more, either the
  block wants to be its own named function with the rationale as its docstring, or the rationale
  belongs in a document (below) with a one-line pointer left behind.
- **Docstrings** on public functions and classes state the contract — arguments a caller can get
  wrong, the failure mode, what the return means — not a restatement of the signature. A private
  helper with a clear name usually needs none.

## Budget rules — checkable in review

- No comment restates the code. `# increment the counter`, `// fetch the rows`, and a docstring that
  reads "Returns the channel id" over `channel_id_of(...)` are deleted on sight.
- No ISO dates (`2026-09-21`) and no bare commit hashes (`2e98b52e`) in comments: both read fine the
  day they are written and are silently wrong a year later. Cite what stays resolvable — a decision
  record by ID (`0011`, `0037`), a pull request by number (`PR #942`), a PRD or plan by its ID —
  which is how this codebase already cites its own history.
- One rationale, one place. Two nearby functions sharing a reason state it once, on the one that
  owns the decision, and the other points at it.
- A `TODO` names an owner or a tracking item, or it is a decision being avoided; in this repo the
  tracked form is a plan milestone or a debt note under `docs/`, not an inline marker.

## Relocation — when a comment is genuinely too long

1. A cross-cutting design decision goes to a decision record under `docs/decisions/` (the
   `decision-records` skill); the comment shrinks to one line plus the record's ID.
1. Engineering rationale tied to one subsystem — a sync algorithm, a proof of a race, an operating
   procedure — goes to `docs/engineering/<topic>.md`; the comment points at it by path.
1. Rationale tied to one module and read by every editor of it goes in the module docstring or
   header block, where it is already the convention.
1. **Never delete rationale without relocating it first.** If no destination fits, that is a sign to
   ask, not to cut.

## Examples

**Incorrect — restates the code:**

```python
# set the lease to 60 seconds
LEASE_SECONDS = 60
```

```ts
// map each row to its label
const labels = rows.map(sourceStatusLabel);
```

**Incorrect — a paragraph inside a function body, and a date that will go stale:**

```python
async def hold(conn: AsyncConnection, item_id: int) -> None:
    # As of 2026-03-02 a channel backfill can run for over an hour, which is far
    # past the lease, and without a heartbeat the item is redelivered mid-flight
    # to a second worker which then double-inserts every message it re-reads. We
    # therefore stamp locked_at on every batch. See also the fix in 2e98b52e.
    await conn.execute("UPDATE ingest_queue SET locked_at = now() WHERE id = %s", (item_id,))
```

**Correct — the rationale moves to the module docstring; the body keeps one line:**

```python
"""...A crashed worker's claim expires with its lease and the item retries; a live
worker holds its claim past the lease by heartbeating ``locked_at`` (``hold``), so
slow items — a channel backfill can far outlast the lease — are never redelivered
mid-flight (0011)."""


async def hold(conn: AsyncConnection, item_id: int) -> None:
    # Heartbeat, not a re-claim: see the module docstring on lease expiry.
    await conn.execute("UPDATE ingest_queue SET locked_at = now() WHERE id = %s", (item_id,))
```

**Correct — allowlist item 1, an invariant, as a header block above the type it protects:**

```ts
/**
 * What an answer from a session-guarded door means.
 *
 * 404 is the row that matters. Denied and gone answer identically upstream
 * (0037), so nothing downstream may tell them apart either. Adding a `denied`
 * here is how that posture would be lost.
 */
export type Outcome = "ok" | "login" | "gone" | "error";
```

**Also correct — self-explanatory, no comment at all:**

```python
def normalize(value: str | None) -> str | None:
    return value.strip() or None if value else None
```
