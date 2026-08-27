import { describe, expect, it } from "vitest";

import { sanitizePromptImageUrl, sanitizePromptImageUrls } from "./prompt-image-url";

describe("prompt image URL policy", () => {
    it("drops Linux.do images that reject cross-origin embedding", () => {
        expect(sanitizePromptImageUrl("https://linux.do/uploads/default/example.jpeg")).toBe("");
        expect(sanitizePromptImageUrl("https://www.linux.do/uploads/default/example.jpeg")).toBe("");
    });

    it("drops the known missing Banana Prompt Quicker Avatar assets", () => {
        expect(sanitizePromptImageUrl("https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/afadan.png")).toBe("");
        expect(sanitizePromptImageUrl("https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/afadan_ref1.jpg")).toBe("");
    });

    it("keeps working jsDelivr, local, data, and blob images", () => {
        expect(sanitizePromptImageUrl("https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/apple.png")).toContain("apple.png");
        expect(sanitizePromptImageUrl("/images/local.png")).toBe("/images/local.png");
        expect(sanitizePromptImageUrl("data:image/png;base64,YQ==")).toBe("data:image/png;base64,YQ==");
        expect(sanitizePromptImageUrl("blob:https://example.com/id")).toBe("blob:https://example.com/id");
    });

    it("removes blocked and duplicate references while preserving order", () => {
        expect(sanitizePromptImageUrls(["https://linux.do/uploads/default/example.jpeg", "/images/a.png", "/images/a.png", "/images/b.png"])).toEqual(["/images/a.png", "/images/b.png"]);
    });
});
