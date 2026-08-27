export type PromptValues = Record<string, string | undefined>;
export type PromptVariable = { key: string; label: string; defaultValue: string; occurrences: number };

type Token = { kind: "text"; value: string } | { kind: "variable"; key: string; defaultValue?: string; raw: string };
const pattern = /\{\{([^{}]+)\}\}/g;

function parse(template: string): Token[] {
    const tokens: Token[] = [];
    let cursor = 0;
    for (const match of template.matchAll(pattern)) {
        const raw = match[0]; const inner = match[1]; const index = match.index || 0;
        if (index > cursor) tokens.push({ kind: "text", value: template.slice(cursor, index) });
        const separator = inner.indexOf(":"); const key = (separator < 0 ? inner : inner.slice(0, separator)).trim();
        tokens.push(key ? { kind: "variable", key, defaultValue: separator < 0 ? undefined : inner.slice(separator + 1).trim(), raw } : { kind: "text", value: raw });
        cursor = index + raw.length;
    }
    if (cursor < template.length) tokens.push({ kind: "text", value: template.slice(cursor) });
    return tokens;
}

export function getTemplateVariables(template: string): PromptVariable[] {
    const variables = new Map<string, PromptVariable>();
    for (const token of parse(template)) if (token.kind === "variable") {
        const item = variables.get(token.key);
        if (item) { item.occurrences += 1; if (!item.defaultValue && token.defaultValue) item.defaultValue = token.defaultValue; }
        else variables.set(token.key, { key: token.key, label: token.key, defaultValue: token.defaultValue || "", occurrences: 1 });
    }
    return [...variables.values()];
}

export function compilePrompt(template: string, values: PromptValues): string {
    return parse(template).map((token) => token.kind === "text" ? token.value : values[token.key]?.trim() || token.defaultValue || token.raw).join("");
}
