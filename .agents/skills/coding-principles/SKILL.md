---
name: coding-principles
description: >-
  The four language-agnostic rules every line of lanh-authored code follows — complexity
  management, naming, function organization, and comment discipline — written for this repo's two
  main languages, Python (`src/lanh/`) and TypeScript/React (`frontend/`), and applied as written to
  the Rust in `src/meetbot/` (MBRS) in Rust's own casing. Load BEFORE writing, editing,
  or reviewing any code in this repository, and before planning a coding task; the Tech Lead review
  lens judges a pull request against these same rule files. Covers when each rule applies, what it
  does not cover (formatter and linter territory, the layer rule, the vendored boundary), and the
  one exemption (vendored PipesHub paths), plus three front-end-only rules for `frontend/` —
  components render while hooks and utils decide, one folder per screen, styles as CSS beside their
  screen. Keywords: coding principles, code quality, complexity, naming, function order, comments,
  comment budget, review rubric, screen folders, hooks, utils.
---

# Coding principles

The rules for building code in Lanh AI. Four rules, each one file under `rules/`, each applying to
both Python and TypeScript unless it says otherwise; and three more under `rules/frontend/` that
apply to `frontend/` only (FEND). The CI review sends the front-end three only when a `frontend/`
file is under review.

## When to apply

- Writing or editing code under `src/lanh/`, `frontend/`, `scripts/`, or `tests/`.
- Reviewing a code change — a human review, the `self-review` skill, or the CI Tech Lead lens, which
  is given these files as part of its rubric.
- Planning a coding task: a plan that would violate a rule is a plan to fix first.

## Instructions

- The rules are absolute. When existing code violates one, follow the rule anyway and do not
  replicate the violation; fix the surrounding code only when the task already owns it.
- Cite the rule by name (`complexity-management`) when a review finding or a commit message rests on
  it.
- **Exemption — vendored code.** The PipesHub-vendored paths named in `src/lanh/AGENTS.md`
  ("Vendored boundary") and `NOTICE` are outside every rule here: donor style is never judged and
  never reformatted. A `lanh patch` inside a vendored file follows the donor's local style, not
  these rules.

## What these rules are not

- **Not formatter or linter territory.** `ruff` (`E`/`F`/`I`, line length 100) and the front-end
  toolchain own layout, import order, and unused names; `pre-commit` applies them. A rule here is
  about shape and intent, which no formatter checks.
- **Not the repository invariants.** The layer rule, subsystem ownership, the vendored boundary, and
  the backend↔frontend coupling live in `src/lanh/AGENTS.md` and `frontend/AGENTS.md`; UI surfaces
  follow the `ui` skill. This skill cites them and never restates them.

## Workflow

When this skill is triggered:

1. Read the four rules in [Quick reference](#quick-reference) — all are required.
1. Decide which rules the task will actually exercise (a rename touches naming; a new sync pass
   touches complexity and organization; nearly everything touches comments).
1. Keep those rule files open while writing, and check the change against them before reporting
   done.

## Quick reference

All four are required.

- `complexity-management` — Keep functions small and single-purpose; branch once per concept;
  extract a helper when logic repeats or a block needs its own name.
- `naming-conventions` — Names reveal intent in the domain's own words; booleans read as predicates;
  the public surface is the minimum a consumer imports.
- `function-organization` — Top-to-bottom reading flow: the entry point first, its helpers below it,
  no nested function definitions; long conditionals become named predicates.
- `comment-discipline` — No comments by default; a comment carries a non-obvious WHY, never the
  WHAT. Inline body comments stay short; rationale that needs a paragraph lives in a module
  docstring or header block, a decision record, or `docs/engineering/`. Cite decision records by ID
  and pull requests by number, never ISO dates or bare commit hashes.

Front end only (`rules/frontend/`), required for any change under `frontend/`:

- `component-logic-separation` — Components render; state and effects go in `hooks/`, pure decisions
  in `utils/` (tested, no React), requests in `api.ts`.
- `component-organization` — One kebab-case folder per dashboard screen, one subfolder per child;
  nothing new at the top of `dashboard/`.
- `styles-beside-component` — A screen's styles are `<Screen>.css` beside it, imported as text,
  tokens only, every selector prefixed.

## How to use

Read the rule files for the reasoning and the examples:

```
.agents/skills/coding-principles/rules/<rule-name>.md
```

Each file carries a short statement of the rule and why it matters, an incorrect example, and a
correct one — in Python and in TypeScript where the rule applies to both. New rules follow
`_TEMPLATE.md`.
