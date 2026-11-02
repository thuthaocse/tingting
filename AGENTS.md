# Lilac project instructions

## Stack

- Frontend: React + TypeScript + CSS Modules. Do not introduce Tailwind or CSS-in-JS.
- Backend: Rust + Axum + async-graphql; PostgreSQL accessed with SQLx.
- Default product language: Vietnamese. Currency: VND. Dates use Asia/Ho_Chi_Minh.

## Documentation

Write all repository documentation in English, including README files, guides, architecture notes, verification reports, and skill instructions. Use English prose and examples in documentation; keep the application's Vietnamese product language unchanged. Follow .agents/skills/documentation-conventions/SKILL.md when creating or editing documentation.

## Design system

- Reuse packages/design-system; tokens.css is the only source of color/spacing/radius tokens.
- Each component uses an adjacent *.module.css file; global.css contains resets only.
- Mobile first. Personal balances default to two collapsed rows. Group debts are compact single rows.
- Show explicit payer, recipient, amount. Do not add a global debt sidebar to the overview.
- Keep visible labels, keyboard focus, reduced-motion support, semantic buttons and native dialogs.

## Business rules

- Integer VND only, maximum 1,000,000,000,000 per transaction. Never use float arithmetic.
- Default split selects all members equally. Remainders assigned by sorted member UUID.
- Backend owns balances and settlement suggestions. Simplification does not rewrite transactions.
- Name selection is a local viewing preference, never an authentication credential.
- Public group API must not reveal member emails. Guests are read-only; all transaction writes require Google authentication. The root admin thuthao.cse@gmail.com can delegate admin or creator rights by verified email. Admins manage groups and roles; creators may only create groups. Check permissions on the server.
- Home balances match verified account email to a unique member email, never the viewing dropdown.
- Require optimistic versions on every group mutation. Never silently overwrite another edit.
- Preserve audit history. Do not remove a member referenced by any transaction.

## Verification

- npm test
- npm run build
- cargo fmt --check --manifest-path apps/api/Cargo.toml
- cargo test --manifest-path apps/api/Cargo.toml
- npm run test:integration:local (requires local Compose API/database; trusted session fixtures)
- Verify mobile and desktop behavior after meaningful UI changes.

## Git

Use descriptive branches without a codex/ prefix. Use plain-language commit messages and PR titles.

## External skills

Read .agents/skills/coding-principles/SKILL.md and its rule files before code changes. Source and revision are recorded in .agents/skills/README.md.
Map frontend/ to apps/web/src/features and packages/design-system. The user explicitly chose CSS Modules: this overrides the source skill's Bun text imports and global selector prefixes. Use adjacent *.module.css and tokens.css. Do not import Lanh-specific Python/Bun workflows or its visual design into Lilac.
