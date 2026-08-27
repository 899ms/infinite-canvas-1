# Shared Product Design System Specification

Version: `1.0.0`  
Status: Canonical  
Language baseline: `zh-CN`, LTR  
Applies to: web products, internal tools, image libraries, prompt tools, and adjacent content workflows

This document defines the portable product design system shared by this project and future projects. It is the contract above any framework, component generator, or application. shadcn/ui, Base UI, TanStack Start, React, Tailwind CSS, or another stack may implement the contract, but none of them replaces it.

The initial values are grounded in `docs/DESIGN_SYSTEM.md`, the measured interaction notes under `docs/research/`, and the desktop/mobile captures under `docs/design-references/webtomind/`. The reference site's branding, copy, and image assets are deliberately excluded.

## 1. Design principles

1. **Content first.** The interface gives images, prompts, and decisions visual priority. Chrome remains quiet.
2. **Dense, not cramped.** Information density comes from predictable rhythm, compact controls, and strong hierarchy—not tiny text or undersized hit targets.
3. **Neutral by default.** Ink and warm neutrals form the base. Color communicates feedback, risk, or data and is never decorative noise.
4. **State is visible.** Loading, selected, saved, hidden, failed, and destructive states must be explicit in the local context.
5. **Reversible by design.** High-impact actions use confirmation or undo. Soft delete is recoverable.
6. **Accessible at the primitive layer.** Keyboard behavior, focus management, semantics, contrast, and reduced motion are component requirements.
7. **Tokens over one-off values.** Product code consumes semantic, layout, and component tokens. Raw values live only in token sources.
8. **Portable contracts.** Names and behavior remain stable across frameworks. Implementations may vary; user-visible semantics may not.
9. **Chinese-first, globally ready.** Chinese typography and text expansion are first-class. Localization does not require component redesign.
10. **Measured consistency.** Visual and behavioral QA is required at defined viewports and states before a system change ships.

## 2. System architecture

### 2.1 Four token layers

| Layer          | Purpose                            | Examples                                                                      | Product code may consume |
| -------------- | ---------------------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| Primitive      | Raw scales without product meaning | `color.neutral.900`, `space.4`, `duration.fast`                               | No                       |
| Semantic       | Intent that survives theme changes | `color.text.primary`, `color.surface.canvas`, `color.feedback.reject`         | Yes                      |
| Component      | Stable component decisions         | `button.height.md`, `dialog.radius`, `input.border.focus`                     | Yes                      |
| Product/layout | App-shell and domain decisions     | `layout.sidebar.expanded`, `gallery.gap.desktop`, `feedback.rating.reinforce` | Yes                      |

Dependencies point downward only:

```text
Product and component tokens
            ↓
      Semantic tokens
            ↓
      Primitive tokens
```

A primitive must never reference a semantic token. A semantic token may not reference a component token. Components must not bypass semantic meaning by consuming a raw color.

### 2.2 Canonical data format

The portable source uses the Design Tokens Community Group shape:

```json
{
  "color": {
    "text": {
      "primary": {
        "$type": "color",
        "$value": "{color.neutral.900}",
        "$description": "Primary text on the default canvas."
      }
    }
  }
}
```

Every leaf token has:

- `$type`: one of `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `shadow`, `number`, or `string`.
- `$value`: a literal value or an alias in `{dot.path}` form.
- `$description`: user-facing intent, not a repetition of the name.
- Optional `$extensions`: deprecation, owner, introduced version, or platform metadata.

Compiled CSS variables are an output, not a second source of truth. Applications may expose dot paths as kebab-case variables:

```text
color.text.primary → --ds-color-text-primary
layout.sidebar.expanded → --ds-layout-sidebar-expanded
button.height.md → --ds-button-height-md
```

### 2.3 Modes

The common contract supports:

- `light`: required and enabled by default.
- `dark`: required token mapping; applications may enable it when their product supports dark mode.
- `compact`: optional density override for pointer-first administration tools.
- `comfortable`: default density and the only density allowed on touch-first surfaces.

Theme modes change semantic aliases, never primitive names or component API.

## 3. Naming rules

Use lowercase dot notation in token data and `--ds-` kebab-case in CSS.

```text
category.role.variant.state
```

Preferred names describe purpose:

- Good: `color.text.muted`, `color.border.danger`, `space.component.inline.md`
- Avoid: `grayText`, `lightBorder`, `red500Button`, `cardGap18`

Rules:

1. Numeric suffixes belong only to scales, such as `neutral.500` and `space.4`.
2. Semantic tokens use roles, such as `primary`, `muted`, `danger`, `selected`.
3. Component tokens start with the component noun, such as `button.height.md`.
4. State suffixes are consistent: `default`, `hover`, `pressed`, `focus`, `selected`, `disabled`, `loading`, `invalid`.
5. Size suffixes are `xs`, `sm`, `md`, `lg`, `xl`; `default` is not a size.
6. Breakpoint names are `mobile`, `tablet`, `desktop`, `wide`, not device brands.
7. Token renames follow the deprecation policy in section 19; aliases bridge at least one minor version.

## 4. Color

### 4.1 Primitive palette

The default palette is intentionally small. Product teams must not create a new accent palette for every feature.

| Token               | Value     | Role                       |
| ------------------- | --------- | -------------------------- |
| `color.neutral.0`   | `#ffffff` | Pure white                 |
| `color.neutral.25`  | `#fafaf9` | Warm canvas                |
| `color.neutral.50`  | `#f7f7f5` | Secondary surface          |
| `color.neutral.100` | `#f3f3f1` | Quiet surface and skeleton |
| `color.neutral.200` | `#e7e5e2` | Solid border               |
| `color.neutral.400` | `#a3a3a3` | Disabled text              |
| `color.neutral.500` | `#737373` | Secondary text             |
| `color.neutral.700` | `#404040` | Strong secondary text      |
| `color.neutral.850` | `#242422` | Raised dark surface        |
| `color.neutral.900` | `#171717` | Ink and dark canvas        |
| `color.neutral.950` | `#0f0f0e` | Deep overlay               |
| `color.amber.500`   | `#e69a10` | Selected rating            |
| `color.green.700`   | `#15803d` | Reinforcement/success      |
| `color.orange.700`  | `#c2410c` | Downweight/warning         |
| `color.red.600`     | `#dc2626` | Dark-theme reject/error    |
| `color.red.700`     | `#b91c1c` | Light-theme reject/error   |

Warm translucent border primitives:

- Light: `rgba(38, 31, 26, 0.12)`
- Dark: `rgba(255, 255, 255, 0.12)`
- Scrim light: `rgba(15, 15, 14, 0.52)`
- Scrim dark: `rgba(0, 0, 0, 0.68)`

### 4.2 Light semantic mapping

| Semantic token              | Value/alias                 |
| --------------------------- | --------------------------- |
| `color.surface.canvas`      | `{color.neutral.25}`        |
| `color.surface.default`     | `{color.neutral.0}`         |
| `color.surface.subtle`      | `{color.neutral.50}`        |
| `color.surface.muted`       | `{color.neutral.100}`       |
| `color.surface.floating`    | `rgba(255, 255, 255, 0.92)` |
| `color.surface.inverse`     | `{color.neutral.900}`       |
| `color.surface.scrim`       | `rgba(15, 15, 14, 0.52)`    |
| `color.text.primary`        | `{color.neutral.900}`       |
| `color.text.secondary`      | `{color.neutral.700}`       |
| `color.text.muted`          | `{color.neutral.500}`       |
| `color.text.disabled`       | `{color.neutral.400}`       |
| `color.text.inverse`        | `{color.neutral.0}`         |
| `color.border.default`      | `rgba(38, 31, 26, 0.12)`    |
| `color.border.strong`       | `{color.neutral.200}`       |
| `color.action.primary`      | `{color.neutral.900}`       |
| `color.action.primaryText`  | `{color.neutral.0}`         |
| `color.focus.ring`          | `{color.neutral.900}`       |
| `color.feedback.reinforce`  | `{color.green.700}`         |
| `color.feedback.variant`    | `{color.amber.500}`         |
| `color.feedback.neutral`    | `{color.neutral.500}`       |
| `color.feedback.downweight` | `{color.orange.700}`        |
| `color.feedback.reject`     | `{color.red.700}`           |
| `color.status.success`      | `{color.green.700}`         |
| `color.status.warning`      | `{color.orange.700}`        |
| `color.status.error`        | `{color.red.700}`           |

### 4.3 Dark semantic mapping

| Semantic token              | Value/alias                 |
| --------------------------- | --------------------------- |
| `color.surface.canvas`      | `{color.neutral.950}`       |
| `color.surface.default`     | `{color.neutral.900}`       |
| `color.surface.subtle`      | `{color.neutral.850}`       |
| `color.surface.muted`       | `#2c2c29`                   |
| `color.surface.floating`    | `rgba(36, 36, 34, 0.94)`    |
| `color.surface.inverse`     | `{color.neutral.25}`        |
| `color.surface.scrim`       | `rgba(0, 0, 0, 0.68)`       |
| `color.text.primary`        | `#f5f5f4`                   |
| `color.text.secondary`      | `#d6d3d1`                   |
| `color.text.muted`          | `#a8a29e`                   |
| `color.text.disabled`       | `#78716c`                   |
| `color.text.inverse`        | `{color.neutral.900}`       |
| `color.border.default`      | `rgba(255, 255, 255, 0.12)` |
| `color.border.strong`       | `rgba(255, 255, 255, 0.20)` |
| `color.action.primary`      | `{color.neutral.25}`        |
| `color.action.primaryText`  | `{color.neutral.900}`       |
| `color.focus.ring`          | `#f5f5f4`                   |
| `color.feedback.reinforce`  | `#4ade80`                   |
| `color.feedback.variant`    | `#fbbf24`                   |
| `color.feedback.neutral`    | `#a8a29e`                   |
| `color.feedback.downweight` | `#fb923c`                   |
| `color.feedback.reject`     | `#f87171`                   |
| `color.status.success`      | `#4ade80`                   |
| `color.status.warning`      | `#fb923c`                   |
| `color.status.error`        | `#f87171`                   |

### 4.4 Color rules and accessibility

- Normal text must meet WCAG AA contrast of at least `4.5:1`; text at least 24 px regular or 18.66 px bold must meet `3:1`.
- Essential non-text UI, focus indicators, and control boundaries must meet `3:1` against adjacent colors.
- Feedback color is paired with a label or icon. Color never carries the only meaning.
- Large colored surfaces use semantic surface tokens, not feedback text colors.
- Disabled controls remain readable; opacity cannot lower labels below practical legibility.
- Images are never tinted to communicate rating because tint changes the content being judged.
- Theme QA checks both semantic mappings. Do not invert images, shadows, or brand assets automatically.

For shadcn-compatible projects, map its public variables to semantic tokens:

```text
--background          → color.surface.canvas
--foreground          → color.text.primary
--card / --popover    → color.surface.default
--primary             → color.action.primary
--primary-foreground  → color.action.primaryText
--secondary / --muted → color.surface.muted
--muted-foreground    → color.text.muted
--border / --input    → color.border.default
--ring                → color.focus.ring
--destructive         → color.feedback.reject
```

## 5. Spacing and sizing

### 5.1 Primitive spacing scale

The base unit is 4 px. The portable scale preserves measured product values, including 6, 10, 14, and 18 px.

| Token       | Value | Typical use             |
| ----------- | ----: | ----------------------- |
| `space.0`   |  0 px | Reset                   |
| `space.1`   |  4 px | Micro-gap               |
| `space.1_5` |  6 px | Tight grouping          |
| `space.2`   |  8 px | Icon-to-label           |
| `space.2_5` | 10 px | Mobile gallery gap      |
| `space.3`   | 12 px | Control inline padding  |
| `space.3_5` | 14 px | Compact card content    |
| `space.4`   | 16 px | Mobile page gutter      |
| `space.4_5` | 18 px | Desktop gallery gap     |
| `space.5`   | 20 px | Standard control group  |
| `space.6`   | 24 px | Section interior        |
| `space.8`   | 32 px | Desktop gutter          |
| `space.10`  | 40 px | Compact section break   |
| `space.12`  | 48 px | Major section break     |
| `space.16`  | 64 px | Page section separation |
| `space.20`  | 80 px | Large page ending       |

### 5.2 Spacing application

- Inline icon/label gap: 8 px.
- Related field gap: 12–16 px.
- Card content padding: 14–16 px compact; 24 px editorial.
- Page gutter: 16 px mobile; 24 px tablet; 32 px desktop.
- Section separation: 32 px compact; 48 px standard; 64 px landing/editorial.
- Desktop image gallery gap: 18 px; mobile image gallery gap: 10 px.
- Touch targets stay at least 44×44 px even when visual glyphs are smaller.
- Do not add anonymous 13, 17, or 23 px spacing in product code. If a value is structurally necessary, propose a token.

## 6. Grid and layout

### 6.1 Breakpoints

| Token                |   Start | Intent                                           |
| -------------------- | ------: | ------------------------------------------------ |
| `breakpoint.mobile`  |    0 px | Touch-first, bottom navigation                   |
| `breakpoint.tablet`  |  760 px | Collapsed sidebar, moderate canvas               |
| `breakpoint.desktop` | 1100 px | Expanded sidebar, full workspace                 |
| `breakpoint.wide`    | 1440 px | Preserve max content width; add outer whitespace |

Breakpoints respond to layout pressure, not a list of devices. Components may use container queries for local adaptation.

### 6.2 Product layout tokens

| Token                        | Value                                |
| ---------------------------- | ------------------------------------ |
| `layout.content.max`         | 1180 px                              |
| `layout.sidebar.expanded`    | 220 px                               |
| `layout.sidebar.collapsed`   | 72 px                                |
| `layout.gutter.mobile`       | 16 px                                |
| `layout.gutter.tablet`       | 24 px                                |
| `layout.gutter.desktop`      | 32 px                                |
| `layout.gallery.gap.mobile`  | 10 px                                |
| `layout.gallery.gap.desktop` | 18 px                                |
| `layout.bottomNav.height`    | `64px + env(safe-area-inset-bottom)` |
| `layout.dialog.max`          | 1120 px                              |
| `layout.reading.max`         | 72ch                                 |

### 6.3 Layout behavior

| Viewport     | Shell                                | Gallery              | Detail / builder                     |
| ------------ | ------------------------------------ | -------------------- | ------------------------------------ |
| `< 760px`    | Sidebar hidden; fixed bottom nav     | 2 columns, 10 px gap | Full-height sheet; vertical sections |
| `760–1099px` | 72 px collapsed sidebar              | 4 columns, 18 px gap | Two regions with narrow metadata     |
| `≥ 1100px`   | 220 px sidebar, manually collapsible | 5 columns, 18 px gap | Visual area left; metadata right     |

- The main content centers and stops growing at 1180 px. Wide screens add outer whitespace rather than a sixth gallery column.
- Masonry preserves natural image ratios and uses `break-inside: avoid`.
- Horizontal filter rails scroll on mobile and do not wrap chips into dense multi-line blocks.
- Fixed navigation reserves content space plus the safe-area inset.
- At 200% zoom, the page does not develop horizontal scrolling; a deliberately scrollable local rail may.

## 7. Typography

### 7.1 Font families

Default UI stack:

```text
InterVariable, Inter, "PingFang SC", "Microsoft YaHei",
"Noto Sans CJK SC", system-ui, sans-serif
```

Monospace stack for prompt syntax and code:

```text
"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace
```

Inter Variable is the shared Latin default. A project may substitute Geist by changing `font.family.sans` once; components must not name either face directly. Chinese fallbacks are mandatory because Latin variable fonts do not supply Chinese glyphs.

### 7.2 Type scale

| Token              | Desktop  | Mobile   | Weight | Tracking |
| ------------------ | -------- | -------- | -----: | -------- |
| `type.display`     | 56/60 px | 38/42 px |    700 | -0.04em  |
| `type.heading.1`   | 40/46 px | 32/38 px |    700 | -0.035em |
| `type.heading.2`   | 28/34 px | 24/30 px |    650 | -0.02em  |
| `type.heading.3`   | 20/26 px | 18/24 px |    600 | -0.01em  |
| `type.body.lg`     | 16/26 px | 16/26 px |    400 | normal   |
| `type.body.md`     | 14/22 px | 14/22 px |    400 | normal   |
| `type.body.strong` | 14/20 px | 14/20 px |    600 | normal   |
| `type.label`       | 13/18 px | 13/18 px |    600 | normal   |
| `type.caption`     | 12/18 px | 12/18 px |    500 | normal   |
| `type.eyebrow`     | 11/16 px | 11/16 px |    700 | 0.12em   |
| `type.code`        | 13/20 px | 13/20 px |    450 | normal   |

Rules:

- Chinese labels do not receive forced uppercase or eyebrow tracking.
- Long Chinese body copy targets 45–75 characters per line; prompt text caps at 72ch.
- Use no more than three type styles in a compact component and four in a page header.
- Weight 800/900 is prohibited in product UI. Emphasis comes from hierarchy, rhythm, and contrast.
- Numeric data uses tabular numbers where alignment matters.
- `{{variable}}` uses the monospace token; labels and explanatory text remain sans.

## 8. Shape, borders, elevation, and layering

### 8.1 Radius

| Token             |  Value | Use                     |
| ----------------- | -----: | ----------------------- |
| `radius.sm`       |   8 px | Badge, compact control  |
| `radius.control`  |  10 px | Button, input, textarea |
| `radius.card`     |  14 px | Image and content card  |
| `radius.floating` |  16 px | Filter rail, popover    |
| `radius.dialog`   |  20 px | Desktop dialog          |
| `radius.pill`     | 999 px | Chip, segmented item    |

Nested surfaces use an inner radius no larger than the parent radius minus its padding. Do not mix sharp and soft controls in one workflow without semantic reason.

### 8.2 Border and elevation

| Token                  | Value                                                                            | Use                   |
| ---------------------- | -------------------------------------------------------------------------------- | --------------------- |
| `border.width.default` | 1 px                                                                             | Default boundary      |
| `shadow.floating`      | `0 10px 28px rgba(35,24,16,.06)`                                                 | Floating rail/popover |
| `shadow.dialog`        | `0 24px 72px rgba(23,23,23,.18)`                                                 | Modal dialog          |
| `shadow.focus`         | `0 0 0 2px var(--ds-color-surface-canvas), 0 0 0 4px var(--ds-color-focus-ring)` | Focus-visible         |

Dark mode uses stronger border contrast and softer black shadows; it does not add glowing colored effects.

### 8.3 z-index

| Token             | Value |
| ----------------- | ----: |
| `z.base`          |     0 |
| `z.sticky`        |    10 |
| `z.sidebar`       |    20 |
| `z.bottomNav`     |    30 |
| `z.popover`       |    50 |
| `z.dialogOverlay` |    70 |
| `z.dialog`        |    80 |
| `z.toast`         |    90 |

No product component may declare a z-index above 90. Tooltip, select, and popover share a portal layer and resolve same-layer order by open sequence.

## 9. Iconography

- Default library: Lucide.
- Default size: 18 px; dense metadata: 16 px; standalone navigation: 20–22 px.
- Default stroke width: 1.75; selected navigation may use 2.
- Icon and label gap: 8 px.
- Standalone icon buttons have an accessible name and tooltip on pointer devices.
- Filled and outline icons are not mixed to express the same state. Use one family and a label/check for selection.
- Do not draw custom SVGs when a clear library icon exists.
- Directional icons mirror only in RTL-capable implementations; semantic media controls do not mirror automatically.

## 10. Motion

| Token               | Value                      | Use                         |
| ------------------- | -------------------------- | --------------------------- |
| `duration.fast`     | 120 ms                     | Press, color                |
| `duration.standard` | 180 ms                     | Hover, focus, chip          |
| `duration.reveal`   | 240 ms                     | Popover, card action        |
| `duration.sheet`    | 320 ms                     | Dialog/mobile sheet         |
| `easing.standard`   | `cubic-bezier(.2,.8,.2,1)` | Entrances and state changes |
| `easing.exit`       | `cubic-bezier(.4,0,1,1)`   | Exits                       |

Rules:

- Motion explains state or spatial relationship; no decorative loops in work surfaces.
- Pressed controls may move down 1 px; content does not shrink or bounce.
- Gallery filtering does not animate cards flying between masonry positions.
- `prefers-reduced-motion: reduce` removes displacement and parallax and reduces transitions to near-instant opacity/color changes.
- Loading indicators use rotation only where progress cannot be measured. Skeletons do not shimmer under reduced motion.

## 11. Interaction states

Every interactive component implements this state vocabulary:

| State         | Contract                                                       |
| ------------- | -------------------------------------------------------------- |
| Default       | Clear affordance and label                                     |
| Hover         | Pointer-only enhancement; never the sole route to an action    |
| Pressed       | Immediate, restrained tactile response                         |
| Focus-visible | 2 px ring plus 2 px offset; never globally removed             |
| Selected      | Visual inversion or check plus programmatic selected state     |
| Disabled      | Non-interactive and still readable; reason exposed when useful |
| Loading       | Original dimensions preserved; duplicate action prevented      |
| Success       | Short confirmation next to the initiating control              |
| Warning/error | Cause and recovery action shown locally                        |
| Destructive   | Separated from common actions; explicit wording                |

Search filters title, prompt, style, scene, and tags, with a 150 ms debounce target. Style and scene dimensions compose; “全部” clears only its own dimension. Hover-only card actions must also be available through focus and the mobile detail surface.

## 12. Shared component patterns

Detailed contracts are in `COMPONENT_CONTRACTS.md`; this section defines system-wide composition.

### 12.1 Forms

- Label precedes the control; required state is textual or programmatic, not color alone.
- Default control height is 40 px; search is 44 px; desktop icon buttons are at least 36 px and touch targets are 44 px.
- Field help and error text attach using `aria-describedby`.
- Errors appear after validation intent (submit or blur according to risk), not while the first character is typed.
- Saving retains input content. A persistence failure never clears the field.
- Groups use `fieldset`/`legend` when multiple controls answer one question.

### 12.2 Navigation

- Desktop sidebar is 220 px expanded and 72 px collapsed.
- Active routes use `aria-current="page"` and a visual state independent of hover.
- Mobile uses a fixed bottom navigation with four or fewer primary destinations.
- Sidebar collapse is a preference, not a routing event; it persists locally.
- Breadcrumbs supplement, not replace, a clear page title.

### 12.3 Dialogs and overlays

- Opening moves focus to the title or first meaningful control.
- Background is inert and scroll-locked.
- Escape, an explicit close button, and overlay click close a non-destructive dialog.
- Focus remains trapped while open and returns to the trigger on close.
- Unsaved destructive changes prompt before dismissal; already persisted feedback is not lost.
- Desktop maximum width is 1120 px; mobile uses a full-height sheet with safe-area padding.

### 12.4 Cards

- A card has one primary navigation target. Secondary buttons are siblings, not nested inside the link.
- Hover elevation is subtle and cannot be the only indication of clickability.
- Selected/rated/hidden states remain understandable without hovering.
- Cards use 14 px radius and semantic borders/surfaces.

### 12.5 Image presentation

- Library cards retain natural ratios with `object-fit: cover`; detail images favor `contain`.
- Width/height or aspect metadata prevents layout shift.
- First visible row may load eagerly; remaining assets lazy-load and decode asynchronously.
- AVIF/WebP are preferred with JPEG/PNG fallback.
- Skeletons match final ratios. Failure state includes a label and retry.
- Alt text describes subject and scene; decorative images use empty alt. Full prompts are not alt text.
- Feedback controls never alter crop, brightness, saturation, or hue.

## 13. Product feedback loop

This domain contract is portable to any project that learns from explicit creative feedback.

| Input       | Meaning             | Required presentation    | Data effect                                  |
| ----------- | ------------------- | ------------------------ | -------------------------------------------- |
| 5 stars     | Reinforce           | “强化”; five amber stars | Raise related style/scene weight             |
| 4 stars     | Continue variants   | “继续变体”               | Preserve direction and broaden variation     |
| 3 stars     | Neutral observation | “中性”                   | Record without weight change                 |
| 1–2 stars   | Downweight          | “降权”                   | Lower related style/scene weight             |
| Soft delete | Strongest negative  | “已隐藏 · 强负反馈”      | Hide from normal library; remain recoverable |

Rules:

- Unrated is distinct from zero and from 3 stars; no default rating.
- Rating uses a radio-group mental model and supports arrow keys plus numeric keys.
- Comment is an optional explanatory signal. Saving shows a local timestamp or “已保存”.
- Soft delete means reversible hide, never permanent deletion. The action label is “隐藏并记为强负反馈”.
- A hidden-items view provides restore. Restore does not invent a positive rating.
- Rating, comment, and hide mutations are durable. On failure, restore the previous UI state and report the error in place.
- Feedback color is restrained and accompanied by copy. The image remains visually unmodified.

## 14. Loading, empty, error, and offline states

| Context            | Required behavior                                                  |
| ------------------ | ------------------------------------------------------------------ |
| App loading        | Stable shell first; only the content region waits                  |
| Gallery loading    | Ratio-stable 2/4/5-column skeletons; no full-screen spinner        |
| Empty library      | Explain that no images have arrived; offer import or return action |
| No results         | Echo active conditions and offer “清除筛选”                        |
| Hidden empty       | Explain purpose without warning styling                            |
| Image failure      | Neutral error tile with title/file name and retry                  |
| Local save failure | Keep content, revert optimistic state, show retry nearby           |
| Full-page failure  | Preserve shell; show concise reason, retry, and safe route         |
| Offline            | Announce offline state; never claim unsaved data was persisted     |

Skeletons use `color.surface.muted`. They reserve final geometry and stop animating for reduced-motion users.

## 15. Dark theme

Dark mode is part of the shared token contract even when an individual v1 product ships light-only.

- Activation order: explicit user choice, persisted preference, then `prefers-color-scheme`.
- Theme is applied before first paint to prevent a flash of the wrong mode.
- Applications expose `light`, `dark`, and optionally `system`; the setting is global.
- Only semantic aliases change. Layout, type, spacing, radius, and component behavior stay identical.
- Editorial images retain their source color. Transparent logos may require a declared dark asset.
- Shadows become less visible on dark surfaces; borders carry more separation.
- Dark-mode feedback colors are lighter, not more saturated, to retain contrast.
- Every release that enables dark mode runs the full contrast and state QA matrix in both modes.

## 16. Accessibility

Required baseline:

- WCAG 2.2 AA.
- Complete keyboard operation with visual order matching DOM order.
- Persistent, high-contrast `:focus-visible`.
- Touch targets at least 44×44 px; pointer-first controls at least 36 px tall.
- Dialog focus trap, inert background, meaningful initial focus, and focus return.
- 200% zoom without page-level horizontal scrolling.
- 400% zoom/reflow for primary content and forms where practical.
- Reduced-motion support.
- Labels for all inputs and accessible names for all icon buttons.
- Live regions for asynchronous save/error messages that are not already focused.
- Status is never represented by color, position, or motion alone.
- Image cards avoid nested interactive semantics.
- Rating reports group label, current value, and option label to assistive technology.

Automated checks supplement but do not replace keyboard and screen-reader spot checks.

## 17. Localization and content

- Default locale is `zh-CN`, direction LTR.
- UI strings live outside component code. Components receive labels and messages through props or the localization layer.
- Allow at least 30% text expansion for translated Latin languages and 50% for German-like labels in compact controls.
- Do not truncate action labels that affect data. Wrap, resize, or move them.
- Dates, numbers, relative times, and plural forms use `Intl`.
- Chinese punctuation and line breaking follow browser language rules by setting `lang="zh-CN"` at the document root.
- Mixed prompt/code fields preserve exact braces, whitespace, and punctuation; display text may wrap, copied text may not mutate.
- RTL is not enabled in the current product. A future RTL release must test layout mirroring, icon direction, and bidi prompt content explicitly.
- Product copy is direct: action + consequence, such as “隐藏并记为强负反馈”, not vague “确定”.

## 18. Framework integration

The specification is framework-neutral:

- **shadcn/ui:** generated code is a starting implementation. Map variables to semantic tokens and retain Base UI accessibility behavior.
- **Tailwind:** expose compiled tokens through theme utilities; arbitrary values are prohibited for covered properties.
- **CSS Modules/plain CSS:** consume `var(--ds-…)`; do not duplicate raw literals.
- **Native/mobile:** transform DTCG primitives and semantics into platform resources while preserving names and behavior.
- **Design tools:** import the DTCG token source through a compatible token plugin. Components still require the behavioral contracts in this repository.

Applications consume a pinned design-system version. They do not copy and silently modify token files.

## 19. Governance and versioning

### 19.1 Ownership

- Design-system maintainers own primitives, semantic contracts, shared component behavior, and release notes.
- Product teams own product-specific composition and may propose product tokens.
- Accessibility regressions can block a release regardless of visual approval.

### 19.2 Change process

Every proposal includes:

1. Problem and affected users.
2. Evidence that existing tokens/contracts cannot express the need.
3. Proposed token or contract with light/dark and responsive implications.
4. Affected components and products.
5. Migration and rollback plan.
6. Visual/state/a11y QA evidence.

### 19.3 Semantic versioning

- Patch: documentation correction or implementation fix with no visual/API change.
- Minor: additive token, component variant, or non-breaking behavior.
- Major: removed/renamed token, changed meaning, incompatible component contract, or broad visual reset.

Deprecation policy:

- Mark the old token with replacement and removal version.
- Keep an alias for at least one minor release.
- Warn in builds or lint where possible.
- Remove only in a major release.

Raw color, radius, shadow, z-index, or spacing literals in application code are review failures unless explicitly documented as content data.

## 20. QA matrices

### 20.1 Viewport matrix

| Viewport  | Shell             | Required checks                                                              |
| --------- | ----------------- | ---------------------------------------------------------------------------- |
| 390×844   | Bottom nav        | Two columns, horizontal filters, safe area, full-height sheet, 44 px targets |
| 760×900   | Collapsed sidebar | Breakpoint transition, four columns, keyboard navigation                     |
| 1280×720  | Expanded sidebar  | Five columns, hover/focus parity, dialog fit                                 |
| 1440×1024 | Max content       | 1180 px cap, outer whitespace, no unintended sixth column                    |
| 200% zoom | Reflow            | No page-level horizontal scroll; readable labels and dialogs                 |

### 20.2 Theme/state matrix

Every shared component is checked in light and dark mappings for:

- default;
- hover;
- pressed;
- focus-visible;
- selected;
- disabled;
- loading;
- success;
- warning;
- error/invalid;
- destructive;
- reduced motion.

If an application does not enable dark mode, the shared token package still validates dark token completeness; the application records dark runtime QA as not enabled rather than passed.

### 20.3 Interaction matrix

| Flow               | Mouse/touch      | Keyboard                          | Assistive semantics         | Persistence/failure        |
| ------------------ | ---------------- | --------------------------------- | --------------------------- | -------------------------- |
| Search/filter/sort | Required         | Required                          | Labels and selected states  | URL/local state as defined |
| Card/detail        | Required         | Enter/Space/Escape                | Link/button/dialog roles    | State survives close       |
| Rating             | Tap/click stars  | Arrows and 1–5                    | Radiogroup/value            | Optimistic rollback        |
| Comment            | Edit/save        | Tab/submit shortcut if documented | Label/status                | Content retained on error  |
| Soft delete        | Explicit action  | Required                          | Consequence announced       | Hidden + restore           |
| Prompt variables   | Edit/select/copy | Full keyboard                     | Field labels/code semantics | Exact prompt preserved     |

### 20.4 Content and resilience matrix

- Loading shell and partial loading.
- Zero items.
- One item.
- Long title and long Chinese comment.
- Missing thumbnail.
- Slow image.
- Offline save.
- Persistence quota or database error.
- Hidden item restore.
- 1-, 3-, 4-, and 5-star semantics.
- Very long `{{variable}}` keys and values.
- Browser text scaling and operating-system reduced motion.

### 20.5 Release evidence

Before release:

1. Compare implementation and reference captures side-by-side for structure, density, rhythm, and responsive behavior.
2. Record deliberate differences in branding, copy, and assets.
3. Run lint, type checking, tests, and production build.
4. Inspect the browser console for unhandled errors.
5. Complete keyboard and focus checks.
6. Record exact viewports, states, failures, and untested scope in `design-qa.md`.

A release is `PASSED` only when no core workflow is blocked and all untested or deferred scope is named.
