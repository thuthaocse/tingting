# One folder per screen, one subfolder per child

Applies to `frontend/dashboard/` only (FEND).

Every screen lives in its own kebab-case folder under `dashboard/`, and everything that screen alone
uses lives inside it. A reader who opens `dashboard/lexicon/` sees the whole screen — its parts, its
styles, its hooks, its tests — and nothing else; a flat folder makes them reconstruct that from file
name prefixes.

**Key rules:**

1. **Folder shape:**

   ```
   dashboard/<screen>/
   ├── <Screen>.tsx          # the entry component
   ├── <Screen>.css          # its styles (styles-beside-component)
   ├── styles.ts             # the stylesheet as the string the bundle injects
   ├── <child>/<Child>.tsx   # one subfolder per child component
   ├── hooks/use<Thing>.ts
   ├── utils/<thing>.ts      # with <thing>.test.ts beside it
   └── api.ts
   ```

1. **Names:** folders are kebab-case, component files PascalCase and named for the component they
   export, hooks `use<Thing>.ts`, utils camelCase.

1. **A child used by one screen** lives in that screen's folder. A part two screens need is never
   imported sideways from another screen's folder: a presentational part moves to
   `design-system/components/`, and a wired one — it reads or writes through the door — moves to
   `dashboard/shared/` (`ask-thread.tsx`, `wiki-common.tsx`, `wiki-wire.ts`).

1. **Only these stay at the top of `dashboard/`:** the bundle entries `build-app.ts` names
   (`app.tsx`, `admin.tsx`, `hindsight.tsx`, `ai-tools.tsx`, `ai-tools-allow.tsx`) and the decisions
   every screen shares (`door.ts`, `wire.ts`, with their tests). `just frontend-test` fails on any
   other loose file there, on a screen folder with no `tests/test_ui_e2e_<screen>.py`, and on a
   child that imports its own screen's entry — a helper two children share goes in `api.ts`,
   `utils/` or a child of its own.

   A screen the harness cannot serve (Hindsight, which needs its own control plane) is named with
   the reason in `layout.test.ts`'s `NO_BROWSER_TESTS`, never given an empty test file. A screen too
   big for one test file splits it as `tests/test_ui_e2e_<screen>_<part>.py`.

**Incorrect (one screen spread across siblings by prefix):**

```
dashboard/
├── lexicon.tsx
├── lexicon-app.tsx
├── lexicon-list.tsx
├── lexicon-styles.ts
├── lexicon-api.ts
└── lexicon-wire.ts
```

**Correct:**

```
dashboard/lexicon/
├── Lexicon.tsx
├── Lexicon.css
├── styles.ts
├── api.ts
├── build-app/BuildApp.tsx
├── your-words/YourWords.tsx
├── hooks/useActivity.ts
├── utils/wire.ts
└── utils/wire.test.ts
```
