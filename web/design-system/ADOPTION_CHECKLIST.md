# Design System Adoption Checklist

Use this checklist when a new or existing project adopts the shared design system. It is deliberately framework-neutral; implementation notes for shadcn/ui and Tailwind are included where useful.

## 1. Before adoption

- [ ] Name a design-system owner and a product-side maintainer.
- [ ] Read `SPECIFICATION.md` and `COMPONENT_CONTRACTS.md`.
- [ ] Inventory the project's current colors, typography, spacing, radius, shadow, z-index, breakpoints, and shared components.
- [ ] Record current screenshots at phone, tablet, desktop, and 200% zoom.
- [ ] Identify inaccessible controls, raw values, duplicated components, and one-off variants.
- [ ] Decide whether migration is incremental or a coordinated visual release.
- [ ] Pin a specific design-system version; do not depend on an unversioned branch.
- [ ] Preserve a rollback point before replacing global tokens.

## 2. Install and wire the token source

- [ ] Install or copy the published token artifact according to this directory's README.
- [ ] Treat DTCG token data as the canonical source and generated CSS/platform values as build outputs.
- [ ] Import the design-system CSS before application overrides.
- [ ] Add `lang="zh-CN"` or the correct locale at the document root.
- [ ] Add the Inter Variable font asset or configure the approved `font.family.sans` override.
- [ ] Retain Chinese fallbacks: PingFang SC, Microsoft YaHei, Noto Sans CJK SC, system UI.
- [ ] Map the product's theme variables to shared semantic tokens.
- [ ] For shadcn/ui, map `background`, `foreground`, `card`, `primary`, `muted`, `border`, `ring`, and `destructive` to their shared equivalents.
- [ ] Confirm the light theme renders without any raw fallback colors.
- [ ] If dark mode is enabled, apply semantic dark aliases before first paint and persist `light`/`dark`/`system`.

## 3. Enforce token use

- [ ] Search product code for raw hex, rgb/hsl/oklch, box-shadow, border-radius, z-index, and arbitrary spacing.
- [ ] Replace covered literals with semantic, component, or layout tokens.
- [ ] Keep content data—such as a user-selected swatch—separate from UI theme tokens.
- [ ] Configure lint or review checks to reject new covered raw values.
- [ ] Permit exceptions only with a documented reason, owner, and review date.
- [ ] Confirm primitives are not consumed directly by business pages.

Suggested searches:

```text
#[0-9a-fA-F]{3,8}
rgba?\(
hsla?\(
oklch\(
box-shadow:
border-radius:
z-index:
\[[0-9]+px\]
```

## 4. Typography

- [ ] Map display, headings, body, label, caption, eyebrow, and code styles.
- [ ] Remove component-local font-family declarations.
- [ ] Verify Chinese glyphs use an approved fallback and do not synthesize unsupported weights.
- [ ] Cap long reading and prompt content at the specified readable width.
- [ ] Test long Chinese titles, mixed Chinese/Latin copy, numbers, and `{{variable}}` syntax.
- [ ] Enable tabular figures where columns of numbers must align.
- [ ] Confirm mobile headings use the mobile type values rather than desktop scaling.

## 5. Spacing, grid, and responsiveness

- [ ] Set the 4 px spacing scale, including 6, 10, 14, and 18 px measured steps.
- [ ] Adopt 16/24/32 px page gutters for mobile/tablet/desktop.
- [ ] Apply breakpoints at 760 and 1100 px unless a product-specific layout test justifies a container query.
- [ ] Cap main content at 1180 px.
- [ ] Reserve fixed bottom-navigation height and safe-area inset.
- [ ] Verify 2/4/5 gallery columns and 10/18 px gaps where the gallery pattern is used.
- [ ] Ensure controls never shrink below 44 px on touch surfaces.
- [ ] Test 200% zoom and narrow split-screen widths.

## 6. Core components

For each component, compare the implementation with `COMPONENT_CONTRACTS.md`.

- [ ] Button: sizes, variants, loading width, focus, disabled semantics.
- [ ] Input/Textarea: label, help/error association, invalid and saving states.
- [ ] Tabs: single active item, keyboard arrows, overflow behavior.
- [ ] Dialog: focus trap, initial focus, Escape, overlay, focus return, mobile sheet.
- [ ] Tooltip: delayed pointer reveal, keyboard reveal, no essential hidden-only content.
- [ ] Card: one primary target and non-nested secondary actions.
- [ ] ImageCard: stable ratio, lazy loading, alt/failure states, hover/focus parity.
- [ ] Rating: unrated state, 1–5 keyboard input, label and persistence.
- [ ] Comment: local save status, retained content on failure.
- [ ] SoftDelete: explicit consequence, reversible hidden state, restore.

## 7. Navigation and shell

- [ ] Mark the active route programmatically with `aria-current`.
- [ ] Persist sidebar collapse without turning it into route state.
- [ ] Keep mobile primary destinations to four or fewer.
- [ ] Verify keyboard order follows visual order in expanded and collapsed shells.
- [ ] Ensure fixed elements do not cover the last content item.
- [ ] Preserve shell navigation during loading and full-page errors.

## 8. States and resilience

- [ ] Build loading, skeleton, empty, no-results, partial failure, full error, and offline states.
- [ ] Keep skeleton geometry identical to final content.
- [ ] Provide recovery actions near the failure.
- [ ] Do not clear form or comment content on save failure.
- [ ] Roll back failed optimistic rating/hide mutations.
- [ ] Ensure success is announced locally and not only through a disappearing toast.
- [ ] Check one item, zero items, long content, broken image, and slow network.

## 9. Accessibility

- [ ] Meet WCAG 2.2 AA contrast in all enabled themes.
- [ ] Complete every core workflow with keyboard only.
- [ ] Verify `:focus-visible` is always perceivable.
- [ ] Test dialog initial focus, trap, Escape, inert background, and focus return.
- [ ] Ensure icon-only controls have names and pointer tooltips.
- [ ] Associate errors and help with their fields.
- [ ] Provide live announcements for asynchronous state changes where needed.
- [ ] Ensure color, motion, and position are not the sole state cues.
- [ ] Test reduced motion.
- [ ] Test 200% zoom and at least one screen-reader pass on core flows.

## 10. Localization

- [ ] Move user-facing strings out of shared component internals.
- [ ] Format dates, times, numbers, and plural forms with `Intl`.
- [ ] Test at least 30% label expansion.
- [ ] Avoid truncating destructive or persistence-related actions.
- [ ] Preserve exact prompt syntax when displayed, edited, and copied.
- [ ] If RTL is enabled later, run a separate mirroring and bidi-content audit.

## 11. Dark mode, if enabled

- [ ] Apply theme before first paint.
- [ ] Map all semantic color tokens; do not invert the document.
- [ ] Verify cards, borders, focus rings, overlays, and status colors.
- [ ] Keep images and user assets unchanged.
- [ ] Validate contrast for default, hover, focus, selected, disabled, and destructive states.
- [ ] Confirm operating-system and explicit user preferences resolve predictably.

## 12. Product feedback loop, if used

- [ ] Preserve the exact meanings: 5 reinforce, 4 vary, 3 neutral, 1–2 downweight, hide as strongest negative.
- [ ] Keep “unrated” distinct from 3 stars.
- [ ] Use a radiogroup model for rating.
- [ ] Pair color with “强化 / 继续变体 / 中性 / 降权 / 强负反馈”.
- [ ] Persist ratings, comments, and hidden state.
- [ ] Provide an “已隐藏” view and restore action.
- [ ] Confirm hidden is soft delete, not permanent deletion.
- [ ] Confirm feedback overlays never tint or crop the judged image.

## 13. Migration strategy for an existing project

Recommended sequence:

1. Add tokens without changing component markup.
2. Map semantic colors and typography.
3. Replace spacing, radius, shadow, and z-index literals.
4. Migrate low-risk primitives: Button, Input, Tooltip.
5. Migrate overlays and navigation.
6. Migrate domain components: ImageCard, Rating, Comment, SoftDelete.
7. Remove compatibility aliases only after all consumers are verified.

At each stage:

- [ ] Build and type-check.
- [ ] Capture before/after screenshots.
- [ ] Verify keyboard and focus.
- [ ] Record intentional visual changes.
- [ ] Keep rollback instructions current.

## 14. Release gate

- [ ] 390×844 checked.
- [ ] 760×900 checked.
- [ ] 1280×720 checked.
- [ ] 1440×1024 checked.
- [ ] 200% zoom checked.
- [ ] Light theme state matrix checked.
- [ ] Dark theme state matrix checked or explicitly recorded as not enabled.
- [ ] Mouse/touch and keyboard flows checked.
- [ ] Loading, empty, error, offline, and persistence failure checked.
- [ ] Lint passed.
- [ ] Type checking passed.
- [ ] Automated tests passed.
- [ ] Production build passed.
- [ ] Browser console has no unhandled errors.
- [ ] Visual comparison evidence saved.
- [ ] `design-qa.md` records exact scope, results, known differences, and untested areas.

## 15. Ongoing maintenance

- [ ] Review design-system updates on a pinned cadence.
- [ ] Read release notes before upgrading.
- [ ] Diff generated shadcn/component code instead of overwriting local accessibility and variants.
- [ ] Track deprecated tokens and complete migration before the announced major version.
- [ ] Submit new-token proposals with evidence, light/dark mappings, component impact, and QA.
- [ ] Re-run affected component and viewport matrices after every semantic-token change.
