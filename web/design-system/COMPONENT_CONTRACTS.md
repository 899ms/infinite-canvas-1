# Shared Component Contracts

Version: `1.0.0`  
Companion document: `SPECIFICATION.md`

These contracts define behavior, anatomy, tokens, states, and accessibility. They are portable across React, Vue, native, or other implementations. shadcn/ui and Base UI are recommended implementation starting points, not exemptions from the contract.

## 1. Shared rules

Every interactive component:

- accepts an accessible label independent of visual iconography;
- exposes `default`, `hover`, `pressed`, `focus-visible`, `disabled`, and `loading` where applicable;
- uses semantic tokens rather than raw color or dimensions;
- preserves its geometry while loading;
- supports keyboard operation;
- emits a clear product event rather than coupling directly to persistence;
- allows application copy and localization to be injected;
- avoids nested interactive elements;
- meets a 44×44 px touch target, even when its desktop visual box is 36–40 px.

State priority, highest first:

```text
disabled → loading → invalid/destructive → selected → pressed → hover → default
```

Focus-visible remains visible in every non-disabled state and is not replaced by hover.

## 2. Button

### Purpose

Trigger an immediate action. Navigation to a URL uses a link styled with the same visual tokens, not a button with routing side effects.

### Anatomy

1. Optional leading icon.
2. Required visible label for standard buttons.
3. Optional trailing icon.
4. Optional loading indicator replacing the leading icon.

### Sizes

| Size   |                         Height | Inline padding |     Icon | Use                         |
| ------ | -----------------------------: | -------------: | -------: | --------------------------- |
| `sm`   |                          34 px |          12 px |    16 px | Dense desktop toolbars      |
| `md`   |                          40 px |          14 px |    18 px | Default                     |
| `lg`   |                          44 px |          18 px | 18–20 px | Touch/primary mobile action |
| `icon` | 36 px visual, 44 px hit target |              — |    18 px | Desktop icon action         |

Radius is `radius.control` except pill-shaped filter actions, which use `radius.pill`.

### Variants

- `primary`: ink/inverse; one dominant action per local region.
- `secondary`: quiet surface with strong text.
- `outline`: default surface and border.
- `ghost`: transparent until hover/focus.
- `destructive`: reject/error semantic; explicit consequence copy.
- `link`: text treatment only; use an anchor for navigation.

### Behavior and states

- Pressed may translate down 1 px; do not scale.
- Loading disables duplicate activation, keeps label or supplies an equally clear loading label, and preserves width.
- Disabled blocks activation. Use native `disabled` where available.
- A destructive button does not silently become a permanent-delete action.
- Icon-only buttons require `aria-label`; pointer devices receive a tooltip.

### Suggested interface

```ts
type ButtonProps = {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg" | "icon"
  loading?: boolean
  loadingLabel?: string
  disabled?: boolean
}
```

## 3. Input and Textarea

### Purpose

Collect short or long text while preserving user work and communicating validity and persistence.

### Anatomy

1. Visible label.
2. Optional required/optional indicator.
3. Control.
4. Optional help text.
5. Error or save status.
6. Optional character count.

### Dimensions

- Input/select default height: 40 px.
- Search input: 44 px.
- Textarea minimum height: 112 px.
- Inline padding: 12 px.
- Radius: `radius.control`.
- Field stack gap: 6–8 px; fields in a group: 12–16 px.

### Behavior

- Labels are programmatically associated.
- Help/error/status IDs are connected through `aria-describedby`.
- Invalid sets `aria-invalid="true"` and shows cause plus recovery.
- Validation occurs on submit or meaningful blur, not while the first character is typed.
- Persistence failure retains entered content.
- Search may debounce consumer callbacks around 150 ms; the displayed value updates immediately.
- A password reveal or clear affordance is a separately named button.
- Placeholder is an example, never the only label.

### Textarea save states

| State  | Presentation                                 |
| ------ | -------------------------------------------- |
| Clean  | No persistent status required                |
| Dirty  | “未保存” when autosave is not immediate      |
| Saving | Inline “保存中…” and non-disruptive progress |
| Saved  | Inline “已保存” or timestamp                 |
| Error  | Keep content; show reason and “重试”         |

### Suggested interface

```ts
type FieldState = "idle" | "dirty" | "saving" | "saved" | "error"

type TextFieldProps = {
  label: string
  description?: string
  error?: string
  required?: boolean
  state?: FieldState
}
```

## 4. Tabs

### Purpose

Switch between peer views within one page context. Tabs do not replace primary navigation.

### Anatomy

1. `tablist` with an accessible label.
2. Two or more `tab` elements.
3. One active `tabpanel`.
4. Optional count badge.

### Visual contract

- Compact height: 34–40 px.
- Active item uses clear surface inversion, indicator, or border plus strong text.
- Inactive labels meet normal contrast.
- Mobile tab lists may scroll horizontally; labels do not compress below readable width.

### Keyboard contract

- Left/right arrows move focus; Home/End jump to first/last.
- Activation mode is automatic only when panels render without meaningful delay; otherwise Enter/Space activates.
- Active tab exposes `aria-selected="true"` and `aria-controls`.
- Inactive panels are hidden from accessibility tree.

### Suggested interface

```ts
type TabItem = {
  value: string
  label: string
  count?: number
  disabled?: boolean
}
```

## 5. Dialog

### Purpose

Focus a bounded task or detail view without losing the page context. Use a route when the content must be linkable, deeply navigated, or long-lived.

### Anatomy

1. Scrim.
2. Surface.
3. Title and optional description.
4. Close button.
5. Content.
6. Optional footer actions.

### Layout

- Desktop max width: 1120 px; radius: 20 px; `shadow.dialog`.
- Detail layouts may split visual content left and information right.
- Mobile `<760px`: full-height sheet with safe-area padding and no corner radius against viewport edges.
- Content scrolls inside the dialog; header/critical actions may remain sticky.

### Behavior

- Opening moves focus to the title or first meaningful control.
- Background becomes inert and scroll-locked.
- Tab/Shift+Tab remain within the dialog.
- Escape and explicit close dismiss non-destructive dialogs.
- Overlay click may dismiss only when accidental loss is impossible.
- Closing restores focus to the trigger.
- Persisted ratings/comments remain after close.
- Unsaved destructive changes require a discard decision.
- Nested dialogs are prohibited; use a local confirmation region or replace the current surface.

### Accessibility

- Use `role="dialog"` and `aria-modal="true"` through a tested primitive.
- Title is required and programmatically referenced.
- Description is connected when it helps users predict the task.
- The close button has a localized accessible name.

### Suggested interface

```ts
type DialogProps = {
  open: boolean
  title: string
  description?: string
  dismissible?: boolean
  initialFocus?: "title" | "first-control" | React.RefObject<HTMLElement>
  onOpenChange(open: boolean): void
}
```

## 6. Tooltip

### Purpose

Provide a short label or clarification for a control. Essential instructions and error recovery remain visible outside a tooltip.

### Behavior

- Appears on hover and keyboard focus after a brief delay.
- Dismisses on pointer leave, blur, or Escape.
- Does not appear on tap as the only way to discover a touch action.
- Plain text preferred; no form controls inside.
- Remains within viewport and points to the trigger.
- Multiple tooltips use a shared delay group to avoid repeated waiting.

### Visual contract

- Caption/label typography.
- Compact 6–8 px block and 8–10 px inline padding.
- Inverse or floating semantic surface with compliant contrast.
- `z.popover`; never above a dialog that owns the current focus.

### Accessibility

- Icon-only button still has `aria-label`; tooltip is supplemental.
- Associate descriptive tooltip content with `aria-describedby` only when it genuinely adds description.

## 7. Card

### Purpose

Group related content and optionally expose one primary navigation target.

### Anatomy

1. Optional media.
2. Heading.
3. Supporting content/metadata.
4. Optional status.
5. Optional secondary action region.

### Visual contract

- Default surface and semantic border.
- Radius: 14 px.
- Compact padding: 14–16 px; editorial padding: 24 px.
- Hover elevation is subtle and not required to understand clickability.

### Interaction rules

- A clickable card has one primary link stretched within a safe layer.
- Secondary controls are siblings above that link layer, never nested.
- Focus on the primary link makes the same actions visible as hover.
- Selected, rated, and hidden states remain visible without hover.
- Do not make an entire card a button if it contains selectable text or multiple controls.

### Suggested interface

```ts
type CardProps = {
  tone?: "default" | "subtle"
  interactive?: boolean
  selected?: boolean
  statusLabel?: string
}
```

## 8. ImageCard

### Purpose

Present an image for browsing and aesthetic feedback without visually altering the judged asset.

### Anatomy

1. Ratio-stable image/skeleton/error tile.
2. Primary detail link.
3. Optional metadata.
4. Feedback status badge.
5. Hover/focus action group.

### Media contract

- Library image: natural ratio, `object-fit: cover`.
- Explicit width/height or aspect metadata prevents layout shift.
- First visible row may be eager/priority; remaining images lazy-load and decode asynchronously.
- Preferred delivery: AVIF/WebP with JPEG/PNG fallback.
- Failure tile shows title/file name and retry; never the browser broken-image glyph alone.
- Alt text describes subject and scene. Decorative duplicates use empty alt.

### Interaction contract

- Hover and primary-link focus reveal equivalent actions.
- Mobile users access all actions in the detail sheet.
- Rating/status overlays do not change crop, brightness, saturation, or hue.
- The action region does not overlap critical image content more than necessary.
- Soft-deleted cards leave the normal library and appear in the hidden view.

### States

| State         | Required presentation                                      |
| ------------- | ---------------------------------------------------------- |
| Loading       | Ratio-matched neutral skeleton                             |
| Ready/unrated | Image with no implied default stars                        |
| Rated         | Persistent semantic label/value                            |
| Commented     | Optional comment indicator, not full content overlay       |
| Hidden        | Hidden-view treatment and restore; absent from normal view |
| Failed        | Error tile with retry                                      |

### Suggested interface

```ts
type ImageCardProps = {
  id: string
  src: string
  alt: string
  width: number
  height: number
  rating: 1 | 2 | 3 | 4 | 5 | null
  hasComment?: boolean
  hidden?: boolean
  loading?: "eager" | "lazy"
  onOpen(): void
  onRetry?(): void
}
```

## 9. Rating

### Purpose

Capture an explicit 1–5 aesthetic signal with stable product meaning.

### Semantic mapping

| Value | Meaning             | Label    |
| ----: | ------------------- | -------- |
|     1 | Strong downweight   | 降权     |
|     2 | Downweight          | 降权     |
|     3 | Neutral observation | 中性     |
|     4 | Continue variants   | 继续变体 |
|     5 | Reinforce           | 强化     |

`null` means unrated. It is not zero and must not render as an implicit 3.

### Anatomy

1. Group label, for example “为这张图评分”.
2. Five radio-like star options.
3. Current semantic label.
4. Local persistence status/error.

### Keyboard and accessibility

- Implement as a radiogroup mental model.
- Tab enters the group; arrows change value; Home/End select min/max.
- Numeric keys 1–5 may select directly.
- Each option exposes value and meaning, for example “5 星，强化”.
- Current value and save result are announced without stealing focus.

### Persistence

- Optimistic UI is allowed.
- A failed save restores the prior value and shows a local retry.
- Re-clicking the selected star does not silently clear it. Clearing, if offered, is a separate “清除评分” action.
- Rating changes never mutate comment text or hidden state.

### Suggested interface

```ts
type RatingValue = 1 | 2 | 3 | 4 | 5 | null

type RatingProps = {
  value: RatingValue
  disabled?: boolean
  saving?: boolean
  error?: string
  onChange(value: Exclude<RatingValue, null>): void
  onClear?(): void
}
```

## 10. Comment

### Purpose

Capture optional qualitative context that explains a rating or preference.

### Anatomy

1. Label.
2. Textarea.
3. Optional count/guidance.
4. Save action or autosave status.
5. Error/retry.

### Behavior

- Empty is valid.
- Initial content and latest persisted content are tracked separately.
- Closing a detail dialog does not discard unsaved text without warning.
- A failed save keeps the edited text and exposes retry.
- “已保存” or a localized timestamp appears near the control.
- If autosave is used, debounce only persistence; text input remains immediate.
- Keyboard shortcut to save is optional and must be documented in visible help when enabled.

### Content and privacy

- Plain text by default. If rich text is introduced, sanitize output and add a separate contract.
- Comments are not used as image alt text.
- Do not expose comments in gallery overlays unless the product explicitly requires it.

### Suggested interface

```ts
type CommentProps = {
  value: string
  persistedValue: string
  maxLength?: number
  state: "idle" | "dirty" | "saving" | "saved" | "error"
  error?: string
  onChange(value: string): void
  onSave(): void
  onRetry?(): void
}
```

## 11. SoftDelete

### Purpose

Hide an item from normal workflows and record the strongest negative feedback while preserving recovery.

### Non-negotiable semantics

- This is not permanent deletion.
- Primary action copy: “隐藏并记为强负反馈”.
- Result label: “已隐藏 · 强负反馈”.
- Hidden items remain in a dedicated view.
- Restore is always available to authorized users.
- Restore removes hidden state but does not invent a positive rating.

### Interaction pattern

1. Destructive action is spatially separated from rating/comment save.
2. Before activation, copy explains both consequences: hide + feedback.
3. Activation may use a concise confirmation when context is ambiguous or recovery is not immediately visible.
4. Success removes the item from normal results and announces the change with an undo or hidden-view link.
5. Failure restores the original visible state and presents retry.

### Accessibility

- Button uses destructive semantics and explicit text; a trash icon alone is prohibited.
- Confirmation focus starts on the safer/cancel action when risk is meaningful.
- The result is announced through a live region or focused inline message.
- Restore is a normal explicit button, not a hover-only icon.

### Suggested interface

```ts
type SoftDeleteProps = {
  hidden: boolean
  saving?: boolean
  error?: string
  onHide(): void
  onRestore(): void
  onRetry?(): void
}
```

## 12. Cross-component composition

For an image detail surface, compose in this order:

1. Image and metadata.
2. Rating group with semantic explanation.
3. Comment field with local save state.
4. Soft-delete action separated by a divider and consequence copy.

The components emit independent changes but share one persistence boundary owned by the feature layer. A failure in comment saving must not roll back a successfully persisted rating; a failed hide must not clear either.

## 13. Required component QA

For every component or variant, verify:

- light and dark semantic mappings;
- default, hover, pressed, focus-visible, disabled, loading, and error;
- 390 px touch layout and 1280 px pointer layout;
- keyboard-only completion;
- 200% zoom/reflow;
- reduced motion;
- long Chinese labels and at least 30% translated-text expansion;
- automated accessibility scan plus manual focus inspection;
- no raw covered color, radius, shadow, z-index, or spacing values;
- no browser-console errors during interaction.

Domain components additionally verify:

- unrated, 1, 2, 3, 4, and 5 stars;
- save success and forced save failure;
- long comment and failed retry;
- soft delete, hidden view, restore, and failed hide;
- broken image and slow image;
- hover/focus parity and mobile action access.
