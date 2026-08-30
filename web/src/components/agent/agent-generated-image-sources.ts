export function generatedImageSources(value: unknown, result = new Set<string>()): Set<string> {
    if (typeof value === "string") {
        if (value.startsWith("data:image/") || (/^(?:[A-Za-z]:[\\/]|\/).+\.(?:avif|gif|jpe?g|png|webp)$/i.test(value) && !value.includes("\n"))) result.add(value);
        return result;
    }
    if (Array.isArray(value)) value.forEach((item) => generatedImageSources(item, result));
    else if (value && typeof value === "object") Object.values(value).forEach((item) => generatedImageSources(item, result));
    return result;
}
