import path from "node:path";

/** 从 ImageGen 事件中提取 Windows 或 POSIX 绝对图片路径。 */
export function generatedImagePaths(value: unknown, result = new Set<string>()): string[] {
    if (typeof value === "string") {
        const candidate = value.trim();
        if ((path.isAbsolute(candidate) || /^[A-Za-z]:[\\/]/.test(candidate)) && /\.(?:avif|gif|jpe?g|png|webp)$/i.test(candidate)) result.add(candidate);
        return [...result];
    }
    if (Array.isArray(value)) value.forEach((item) => generatedImagePaths(item, result));
    else if (value && typeof value === "object") Object.values(value).forEach((item) => generatedImagePaths(item, result));
    return [...result];
}
