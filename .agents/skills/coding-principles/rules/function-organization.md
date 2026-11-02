# Function organization and reading flow

Optimize a module for top-to-bottom reading. The entry point a caller uses comes first; the helpers
it calls sit below it, in the order they are called; their helpers below those; shared utilities
last. A reader then meets each name in the role it plays before meeting its body, and never has to
scroll up past a definition to find out what the function they are in is for. Both languages resolve
a name at call time, so a helper defined below its caller is never an error.

**Key rules:**

1. **Never nest a function definition** inside another. The exceptions are the short lambdas and
   arrow callbacks a `sorted(key=...)`, `.map()`, or `.filter()` takes inline, and a closure that
   genuinely captures local state with no other home (a per-call `asyncio` callback). A nested `def`
   or inner `function` that could be hoisted must be.
1. **Extract a block that runs past about fifteen lines**, or that a section comment would otherwise
   label, into a named function below its parent.
1. **Extract a compound conditional** — more than three clauses, or more than two lines — into a
   named predicate. The name states the question; the body states the checks.
1. **Order top-to-bottom:** public entry point → its helpers → their helpers → shared utilities.
   Module-level constants, SQL text, and types stay at the top, above the first function, where this
   codebase already keeps them (`_CLAIM_PICK` in `ingest/queue.py`).
1. **One function, one responsibility.** A function that fetches and then formats, or validates and
   then persists, is two functions; splitting it is what makes each half testable on its own.

**Incorrect (helper nested in its caller; caller buried at the bottom):**

```python
def _partition_of(item: QueueItem) -> str | None:
    return item.channel_id


async def claim(pool: AsyncConnectionPool, lease: float, kinds: Sequence[str] | None) -> Claim | None:
    async def arbitrate(conn: AsyncConnection, channel_id: str | None) -> bool:
        row = await conn.execute(_ARBITER, {"key": channel_id})
        return (await row.fetchone())[0]

    async with pool.connection() as conn, conn.transaction():
        pick = await (await conn.execute(_CLAIM_PICK, {"lease": lease, "kinds": kinds})).fetchone()
        if pick is None:
            return None
        if not await arbitrate(conn, pick.channel_id):
            return None
        if (
            pick.locked_at is not None
            and pick.locked_at > now() - timedelta(seconds=lease)
            and pick.done_at is None
            and pick.attempts < pick.max_attempts
        ):
            return None
        return await _take(conn, pick.id)
```

```ts
export function outcomeOf(status: number): Outcome {
  const isSuccess = (s: number) => s >= 200 && s <= 299;
  if (status === 401) return "login";
  if (status === 404) return "gone";
  if (isSuccess(status)) return "ok";
  return "error";
}
```

**Correct (entry point first, helpers below, predicate named):**

```python
async def claim(pool: AsyncConnectionPool, lease: float, kinds: Sequence[str] | None) -> Claim | None:
    async with pool.connection() as conn, conn.transaction():
        pick = await _pick_head(conn, lease, kinds)
        if pick is None or not await _arbitrate(conn, pick.channel_id):
            return None
        if _is_live_claim(pick, lease):
            return None
        return await _take(conn, pick.id)


async def _pick_head(conn: AsyncConnection, lease: float, kinds: Sequence[str] | None) -> Row | None:
    cursor = await conn.execute(_CLAIM_PICK, {"lease": lease, "kinds": kinds})
    return await cursor.fetchone()


async def _arbitrate(conn: AsyncConnection, channel_id: str | None) -> bool:
    cursor = await conn.execute(_ARBITER, {"key": channel_id})
    return (await cursor.fetchone())[0]


def _is_live_claim(pick: Row, lease: float) -> bool:
    return (
        pick.locked_at is not None
        and pick.locked_at > now() - timedelta(seconds=lease)
        and pick.done_at is None
        and pick.attempts < pick.max_attempts
    )
```

```ts
export function outcomeOf(status: number): Outcome {
  if (status === 401) return "login";
  if (status === 404) return "gone";
  if (isSuccess(status)) return "ok";
  return "error";
}

function isSuccess(status: number): boolean {
  return status >= 200 && status <= 299;
}
```

The rule is about the reader's path, not line counts for their own sake: `claim` now reads as the
four steps it takes, and `_is_live_claim` can be pinned by a test without standing up a queue.
