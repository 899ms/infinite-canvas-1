# @shared-ui/design-tokens

Portable design foundations for React, TanStack Start, Next.js, Vite, Tailwind
CSS v4, or plain CSS projects. The package exposes DTCG 2025.10 source tokens,
framework-agnostic CSS custom properties, and an optional Tailwind adapter.

Product geometry is deliberately excluded. Values such as a particular
sidebar width, content maximum, gallery column count, and application
breakpoints belong to the consuming product.

## Package contents

- `tokens/primitive.tokens.json`: raw color, spacing, type, radius, size,
  motion, and layer values.
- `tokens/semantic.tokens.json`: light/dark color roles, typography roles,
  feedback meaning, elevation, and motion roles.
- `tokens/component.tokens.json`: portable control, button, input, card,
  dialog, chip, feedback badge, and focus tokens.
- `css/tokens.css`: framework-agnostic `--ds-*` custom properties.
- `css/tailwind-theme.css`: Tailwind CSS v4 `@theme inline` adapter.

The JSON files use the DTCG 2025.10 format and can be consumed by compatible
token transformers. Cross-file aliases assume the three JSON files are loaded
into the same token graph.

## Install

From a registry:

```bash
npm install @shared-ui/design-tokens
```

During local development:

```json
{
  "dependencies": {
    "@shared-ui/design-tokens": "file:../design-system"
  }
}
```

## Plain CSS

Import the portable custom properties once:

```css
@import "@shared-ui/design-tokens/css/tokens.css";
```

Then consume them without a framework:

```css
.card {
  padding: var(--ds-component-card-padding);
  border: 1px solid var(--ds-color-border-default);
  border-radius: var(--ds-component-card-radius);
  background: var(--ds-color-background-surface);
  color: var(--ds-color-text-primary);
  box-shadow: var(--ds-shadow-card);
}
```

Apply dark mode on an ancestor:

```html
<html data-ds-theme="dark"></html>
```

The `.ds-theme-dark` class is also supported. Loading an Inter font file is the
consumer's responsibility; the package only supplies a resilient font stack.

## Tailwind CSS v4 and shadcn/ui

Import Tailwind and then the adapter:

```css
@import "tailwindcss";
@import "@shared-ui/design-tokens/css/tailwind-theme.css";
```

This creates familiar semantic utilities such as `bg-background`,
`text-foreground`, `border-border`, `rounded-lg`, `shadow-floating`, and
feedback utilities. shadcn/ui components can use those names directly.

Application-specific shadcn variables should alias the shared semantics rather
than copy values:

```css
:root {
  --background: var(--ds-color-background-canvas);
  --foreground: var(--ds-color-text-primary);
  --card: var(--ds-color-background-surface);
  --border: var(--ds-color-border-default);
  --ring: var(--ds-color-focus);
}
```

## Framework usage

TanStack Start or another Vite application can import from its client entry or
root stylesheet:

```ts
import "@shared-ui/design-tokens/css/tokens.css"
```

Next.js App Router can import it in `app/globals.css`:

```css
@import "@shared-ui/design-tokens/css/tokens.css";
```

Plain Vite/React applications can import it once from `src/main.tsx`:

```ts
import "@shared-ui/design-tokens/css/tokens.css"
```

For Tailwind v4 in any of these frameworks, import `tailwind-theme.css` instead.

## Product overrides

Use a separate product layer loaded after this package:

```css
:root {
  --app-sidebar-width: 13rem;
  --app-content-max: 74rem;
  --ds-color-action-primary: #101010;
}
```

Rules:

1. Do not edit or redefine primitive tokens inside an application.
2. Override semantic `--ds-*` variables only when the product meaning differs.
3. Keep layout, brand campaigns, and one-off component geometry in `--app-*`
   variables owned by the product.
4. Add shared component tokens only when at least two products use the same
   meaning and behavior.
5. Treat the `--ds-*` prefix as reserved for this package.

## Versioning

This package follows semantic versioning:

- **Patch**: corrected metadata, documentation, or a non-visual bug.
- **Minor**: additive tokens and backward-compatible adapters.
- **Major**: removed or renamed tokens, changed semantic meaning, or a visual
  value change likely to alter existing interfaces.

Deprecate a token for at least one minor release before removal. Release notes
must identify changed visual values and provide an alias or migration example.
