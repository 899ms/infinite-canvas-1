const blockedHosts = new Set(["linux.do", "www.linux.do"]);
const missingBananaPromptAssets = new Set(["/gh/glidea/banana-prompt-quicker@main/images/afadan.png", "/gh/glidea/banana-prompt-quicker@main/images/afadan_ref1.jpg"]);

export function sanitizePromptImageUrl(value: string) {
    const url = value.trim();
    if (!url) return "";

    try {
        const parsed = new URL(url, "https://prompt-image.local");
        const protocol = parsed.protocol.toLowerCase();
        const isAllowedDataImage = /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(url);
        if (!isAllowedDataImage && !["http:", "https:", "blob:"].includes(protocol)) return "";
        if (blockedHosts.has(parsed.hostname.toLowerCase())) return "";
        if (parsed.hostname.toLowerCase() === "cdn.jsdelivr.net" && missingBananaPromptAssets.has(parsed.pathname)) return "";
    } catch {
        return "";
    }

    return url;
}

/** Prompt 来源详情只能链接到可公开导航的 HTTP(S) 地址。 */
export function sanitizePromptExternalUrl(value: string) {
    const url = value.trim();
    if (!url) return "";
    try {
        const parsed = new URL(url);
        return ["http:", "https:"].includes(parsed.protocol.toLowerCase()) ? url : "";
    } catch {
        return "";
    }
}

export function sanitizePromptImageUrls(values: string[]) {
    return Array.from(new Set(values.map(sanitizePromptImageUrl).filter(Boolean)));
}
