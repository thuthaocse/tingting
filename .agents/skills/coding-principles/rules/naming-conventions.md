# Naming conventions

Names reveal intent in the domain's own words. A reader should learn what a value is, what a
function does, and what a boolean asks without opening the definition — the name is the only
documentation most call sites ever get (see [`comment-discipline`](comment-discipline.md) for why a
comment is not a substitute). Keep the public surface to what a consumer actually imports.

## Guidelines

- **Say the domain word.** This codebase talks about channels, sources, lanes, passes, claims,
  corpora, and doors; a name uses that vocabulary (`claim_head`, `sourceStatusLabel`), not a generic
  stand-in (`process`, `handle`, `data`, `info`, `result`, `item`, `tmp`, `helper`).
- **Booleans read as predicates.** `is_claimable`, `has_expired`, `can_claim`, `needsDetails` — a
  name that reads as a noun (`claim`, `expiry`) leaves the call site ambiguous.
- **Functions are verbs, values are nouns.** `resolve_channel(...)` returns a channel; `channel`
  holds one. A function whose name is a noun (`channel_resolution`) hides that it does work.
- **Abbreviate only what every reader already knows** — `id`, `url`, `db`, `conn`, `ts` where the
  Slack API itself says `ts`. Never coin one (`chn`, `msgCnt`, `srcCfg`).
- **No type in the name.** `channel_list`, `configDict`, `userArr` restate what the annotation
  already says; `channels`, `config`, `users` do not go stale when the type changes.
- **Minimal public surface.** Python: a module-private helper takes a leading underscore
  (`_CLAIM_PICK`, `_partition_key`); TypeScript: `export` only what another module imports, and
  never re-export for convenience. Each public name is a contract someone can depend on.
- **Language casing is not negotiable.** Python `snake_case` for functions and variables,
  `UPPER_SNAKE` for module constants, `PascalCase` for classes; TypeScript `camelCase`, `PascalCase`
  for types and components, `UPPER_SNAKE` for true constants. `ruff` and the front-end toolchain do
  not check this, so a reviewer does.

**Incorrect (vague, typed, and noun-shaped):**

```python
async def process(pool, data: dict) -> dict:
    res = await get(pool, data["id"])
    flag = res is not None and res["locked_at"] is None
    if flag:
        item_list = await fetch_list(pool, res["chn"])
    return {"ok": flag, "n": len(item_list)}
```

```ts
export const check = (r: Row) => r.f.length > 0 || r.s.length > 0;
export const data = rows.filter(check);
```

**Correct (domain words, predicates, verbs):**

```python
async def claim_channel_head(pool: AsyncConnectionPool, item_id: int) -> ClaimOutcome:
    head = await load_queue_item(pool, item_id)
    is_claimable = head is not None and head.locked_at is None
    pending = await list_pending(pool, head.channel_id) if is_claimable else ()
    return ClaimOutcome(claimed=is_claimable, pending_count=len(pending))
```

```ts
function isUnhealthy(row: SourceRow): boolean {
  return row.failing.length > 0 || row.stalled.length > 0;
}
export const unhealthyRows = rows.filter(isUnhealthy);
```

When a good name is hard to find, that is information: the function probably does two things (see
[`complexity-management`](complexity-management.md)), or the value is a concept the domain has not
named yet — name the concept, then the variable.
