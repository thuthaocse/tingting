# Complexity management

Keep functions small and single-purpose. A function that branches on more than one concept, or whose
body needs section comments to navigate, is several functions wearing one name — and it is the shape
a reviewer cannot falsify, a test cannot pin, and the next change cannot extend without touching
every branch. Reduce branching, extract a helper when a block earns its own name or the same logic
appears twice, and let each function read as one decision.

**Incorrect (one function, four concerns, nested to the margin):**

```python
async def handle_event(pool: AsyncConnectionPool, event: dict[str, Any]) -> None:
    if event["type"] == "message":
        if event.get("subtype") == "message_deleted":
            async with pool.connection() as conn:
                await conn.execute("DELETE FROM slack_messages WHERE ts = %s", (event["ts"],))
        elif event.get("subtype") == "message_changed":
            async with pool.connection() as conn:
                await conn.execute(
                    "UPDATE slack_messages SET text = %s WHERE ts = %s",
                    (event["message"]["text"], event["ts"]),
                )
        else:
            if "files" in event:
                for f in event["files"]:
                    if f.get("mimetype", "").startswith("text/"):
                        # ... 30 lines of file handling ...
                        pass
            async with pool.connection() as conn:
                await conn.execute("INSERT INTO slack_messages ...", (...))
    elif event["type"] == "user_change":
        # ... another 40 lines ...
        pass
```

```ts
export function sourceRowTone(row: SourceRow): Tone {
  if (row.enabled) {
    if (row.lane === "on") {
      if (row.failing.length > 0) return "failed";
      if (row.stalled.length > 0) return "waiting";
      return "done";
    } else if (row.lane === "starting") {
      if (row.failing.length > 0) return "failed";
      return "running";
    } else {
      if (row.failing.length > 0) return "failed";
      return "paused";
    }
  }
  return row.needsDetails ? "waiting" : "paused";
}
```

**Correct (dispatch once, then one function per concept):**

```python
async def handle_event(pool: AsyncConnectionPool, event: dict[str, Any]) -> None:
    match event["type"]:
        case "message":
            await handle_message(pool, event)
        case "user_change":
            await handle_user_change(pool, event)


async def handle_message(pool: AsyncConnectionPool, event: dict[str, Any]) -> None:
    match event.get("subtype"):
        case "message_deleted":
            await delete_message(pool, event["ts"])
        case "message_changed":
            await update_message_text(pool, event["ts"], event["message"]["text"])
        case _:
            await insert_message(pool, event)
            await ingest_text_files(pool, event.get("files", ()))
```

```ts
export function sourceRowTone(row: SourceRow): Tone {
  if (!row.enabled) return row.needsDetails ? "waiting" : "paused";
  if (row.failing.length > 0) return "failed";
  return laneTone(row);
}

function laneTone(row: SourceRow): Tone {
  switch (row.lane) {
    case "on":
      return row.stalled.length > 0 ? "waiting" : "done";
    case "starting":
      return "running";
    default:
      return "paused";
  }
}
```

The dispatching function names every case and does nothing else; the cases can be tested one at a
time; adding a subtype is one new function and one new arm. Early returns on the exceptional
condition (`!row.enabled`, `failing`) flatten the rest. Repeated blocks — the
`async with pool.connection()` prologue and the `failing` check written once per lane above — are
the signal to hoist or extract, not to copy.
