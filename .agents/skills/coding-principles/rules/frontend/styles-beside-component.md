# Styles live beside their screen, as CSS

Applies to `frontend/` only (FEND).

A screen's styles are a plain `<Screen>.css` file next to `<Screen>.tsx`. The screen's `styles.ts`
imports it as text and exports the string `build-app.ts`, the gallery and the mockups inject, so a
build script never imports a component to reach a stylesheet. CSS kept in a TypeScript template
string is invisible to every CSS tool — no formatter, no linter, no editor support — and drifts
unseen.

**Key rules:**

1. **One stylesheet per screen**, `<Screen>.css`, imported in `styles.ts` with
   `import css from "./<Screen>.css" with { type: "text" }`. A child with enough rules of its own
   gets `<Child>.css` in its subfolder, imported by the same `styles.ts`.
1. **Token variables only** — never a literal color, radius, spacing or font (`0040`, the `ui`
   skill). The tokens come from `design-system/tokens.json`. Stylelint refuses a literal color in
   `dashboard/**/*.css`; the rest is the reviewer's to catch.
1. **Every selector carries the screen's class prefix** (`.lb-` for lexicon, `.adm-` for admin).
   Screens share one page, so an unprefixed selector reaches into every other screen.

**Incorrect:**

```ts
// lexicon-styles.ts
export const lexiconCss = `
.list { border: 1px solid #e6e6e4; padding: 12px; }
`;
```

**Correct:**

```css
/* lexicon/Lexicon.css */
.lb-list {
  border: 1px solid var(--line);
  padding: var(--sp-12);
}
```

```ts
// lexicon/styles.ts
import { screenCss } from "../styles";
import css from "./Lexicon.css" with { type: "text" };

export const lexiconCss = `${screenCss}\n${css}`;
```
