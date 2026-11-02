# Tingting design system

Preview: /design-system (no API required).

## Foundations

- Pastel purple brand: #C4B5FD. Action: #6941C6, darkened for readable white button text.
- Background #F8F7FC; ink #292338; positive #087550; danger #B42338.
- Typography: system sans-serif with Vietnamese support. No external font request required.
- Spacing: 4, 8, 12, 16, 24, 32, 48px. Radius: 8, 12, 20px and pill.
- Main breakpoint 640px; intermediate card grid at 760px. Native forms use 44px controls.

## Components

Logo (SVG), Button (primary/secondary/quiet/danger + small/disabled), Input, Field, Avatar, Badge, Tabs and native Modal. Use uiStyles.input for select/textarea when needed. Fields always wrap the control in a visible label. Native dialog traps focus, closes on Escape and restores focus.

## Patterns

Personal balances are two collapsed details/summary sections: money owed and money receivable. Expand independently for recipient/payer rows and Record payment action. Hide an empty section. Show a settled state when both are empty. No large total hero.

Group balances use one compact row per obligation: payer → recipient, amount, Record payment. Activity uses dated receipt/payment rows. Mobile uses a floating add-expense action and full-screen forms. Admin tables become stacked editable member fields on small screens.

## Examples

```tsx
import { Button, Field, Input } from '@tingting/design-system';
import styles from './ExpenseForm.module.css';
<Field label="Expense title"><Input name="title" required /></Field>
<Button type="submit">Save expense</Button>
```

Never use color as the only indicator. Preserve keyboard focus outlines and aria labels for icon buttons. CSS animations must respect prefers-reduced-motion. Keep shared tokens in tokens.css and component styles in CSS Modules.

## Layout and scroll behavior

Desktop group content is capped at 960px; join cards at 420px; dialogs at 560px with 24px viewport clearance. On mobile dialogs fill the dynamic viewport. Dialog headers remain outside the scrolling body; opening a dialog locks background scrolling and closing restores it. Member selection keeps search and Continue outside a bounded scrolling list. A single personal-balance section spans the whole card. Month filters have an independent bounded width; wide totals tables scroll within their own container.

## Money and member controls

MoneyInput displays comma-grouped integer amounts while editing (20,000; 1,200,000) and exposes a numeric onValueChange callback. It accepts pasted Vietnamese grouping, preserves the caret by digit count, and rejects negative/out-of-range values. Summary display still uses vi-VN currency formatting.

SearchSelect replaces native member selects. Type to search with or without Vietnamese accents; Arrow keys, Enter, Escape and Tab are supported. A native popover keeps the list above scrolling dialogs. Both controls are available on /design-system. Summary chevrons and header actions use consistent SVG icons.

The group debt tab is labeled Debts in Vietnamese. Month filtering uses the same styled SearchSelect as members, with Vietnamese month labels and an All time option. Activity has no trailing divider or public-link explanatory footer.
