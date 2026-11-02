# Components render; hooks and utils decide

Applies to `frontend/` only.

A component turns state into markup and wires events to handlers. Everything else lives beside it:
state, effects and reads in a hook under `hooks/`, pure decisions and transforms in `utils/`, and
calls to the backend in `api.ts`. A decision buried in JSX can only be checked by rendering the
screen; the same decision in `utils/` is a function `bun test` pins directly, the way
`dashboard/wire.ts` already pins the disclosure decisions every screen shares.

**Key rules:**

1. **A component body holds** its hook calls, the branching that picks what to render, the mapping
   of data to elements, and handlers that only call something else.
1. **`utils/` is pure.** No React, no `fetch`, no DOM; inputs in, a value out. Biome refuses a
   `react` import there, and every `utils/<thing>.ts` has `<thing>.test.ts` beside it.
1. **A hook owns state and effects** — loading, retry, polling — and returns what the component
   needs to render, already shaped.
1. **`api.ts` owns the requests.** Paths, methods, and turning a response into a typed value or a
   door outcome (`outcomeOf` in `wire.ts`).

**Incorrect (fetching, retry and formatting inside the render function):**

```tsx
export function Lexicon() {
  const [terms, setTerms] = useState<Term[] | null>(null);
  useEffect(() => {
    fetch("/api/lexicon/terms")
      .then((r) => (r.status === 404 ? [] : r.json()))
      .then(setTerms);
  }, []);
  if (terms === null) return <Skeleton />;
  const pending = terms.filter((t) => t.state === "proposed" && !t.withdrawnAt);
  return <TermList terms={pending.sort((a, b) => b.seen - a.seen)} />;
}
```

**Correct (the hook reads, the util decides, the component renders):**

```tsx
// lexicon/Lexicon.tsx
export function Lexicon() {
  const terms = useTerms();
  if (terms === null) return <Skeleton />;
  return <TermList terms={pendingByUse(terms)} />;
}

// lexicon/utils/terms.ts — tested in terms.test.ts
export function pendingByUse(terms: Term[]): Term[] {
  return terms.filter(isPending).sort((a, b) => b.seen - a.seen);
}

function isPending(term: Term): boolean {
  return term.state === "proposed" && term.withdrawnAt === null;
}
```

A one-line expression used once in JSX (`count === 1 ? "word" : "words"`) can stay where it is. The
rule is for logic a reader would want named, or a test would want to reach.
