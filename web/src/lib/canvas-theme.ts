export type CanvasColorTheme = "light" | "dark";
export type CanvasBackgroundMode = "dots" | "lines" | "blank";

export function withAlpha(color: string, opacity: number) {
    return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
}

const canvasTheme = {
    canvas: {
        background: "var(--ds-color-background-canvas)",
        dot: "color-mix(in srgb, var(--ds-color-text-primary) 28%, transparent)",
        line: "color-mix(in srgb, var(--ds-color-text-primary) 12%, transparent)",
        selectionStroke: "var(--ds-color-action-primary)",
        selectionFill: "color-mix(in srgb, var(--ds-color-action-primary) 6%, transparent)",
    },
    node: {
        label: "var(--ds-color-text-secondary)",
        fill: "var(--ds-color-background-subtle)",
        panel: "var(--ds-color-background-surface)",
        stroke: "var(--ds-color-border-strong)",
        activeStroke: "var(--ds-color-action-primary)",
        placeholder: "var(--ds-color-text-subtle)",
        text: "var(--ds-color-text-primary)",
        muted: "var(--ds-color-text-secondary)",
        faint: "var(--ds-color-text-subtle)",
    },
    toolbar: {
        panel: "color-mix(in srgb, var(--ds-color-background-surface) 96%, transparent)",
        border: "var(--ds-color-border-strong)",
        item: "var(--ds-color-text-secondary)",
        itemHover: "var(--ds-color-background-subtle)",
        activeBg: "var(--ds-color-action-secondary)",
        activeText: "var(--ds-color-action-on-secondary)",
        shadow: "var(--ds-shadow-floating)",
    },
} as const;

export const canvasThemes = {
    light: canvasTheme,
    dark: canvasTheme,
} as const;

export type CanvasTheme = (typeof canvasThemes)[CanvasColorTheme];
