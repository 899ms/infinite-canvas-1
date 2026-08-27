const blockedHosts = new Set(["linux.do", "www.linux.do"]);
const missingBananaPromptAssets = new Set(["/gh/glidea/banana-prompt-quicker@main/images/afadan.png", "/gh/glidea/banana-prompt-quicker@main/images/afadan_ref1.jpg"]);

export function sanitizePromptImageUrl(value: string) {
    const url = value.trim();
    if (!url) return "";

    try {
        const parsed = new URL(url, "https://prompt-image.local");
        if (blockedHosts.has(parsed.hostname.toLowerCase())) return "";
        if (parsed.hostname.toLowerCase() === "cdn.jsdelivr.net" && missingBananaPromptAssets.has(parsed.pathname)) return "";
    } catch {
        return "";
    }

    return url;
}

export function sanitizePromptImageUrls(values: string[]) {
    return Array.from(new Set(values.map(sanitizePromptImageUrl).filter(Boolean)));
}
