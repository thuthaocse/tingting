# Installed project skills

## documentation-conventions

Project-owned skill requiring English for all repository documentation and documentation examples. The application remains Vietnamese. Read documentation-conventions/SKILL.md when creating, editing, or reviewing documentation.

## coding-principles
Copied from the local checkout of https://github.com/skymavis/lanh-ai.
Source revision: 99a8fae5977cab04c0f1dbf68fa70d159e9c276e.
The source files are preserved. No upstream setup scripts have been executed.

## Lilac applicability
The four language-independent rules apply to apps/web, apps/api, packages and scripts. Frontend principles map to apps/web/src/features and packages/design-system. User requirements override the source style rule: use adjacent CSS Modules, not Bun text-imported styles or prefixed global CSS. tokens.css is the token source. React hooks own async/state logic; domain calculations are owned by Rust.

Other source skills depend on Lanh-specific decision records, Python QA, Bun scripts, or its design substrate and have not been copied as working Lilac tools. The project's runnable checks are in AGENTS.md.
