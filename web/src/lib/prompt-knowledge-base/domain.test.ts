import { describe, expect, it } from "vitest";

import { addCapture, addPromptCandidate, addRecipeCandidate, addTermCandidate, createEmptyPromptKnowledgeBase, compileRuntimeLibrary, setReviewState, validateReviewable } from "./domain";

describe("prompt knowledge base domain", () => {
    it("only exposes human-approved content to the runtime library", () => {
        let knowledgeBase = createEmptyPromptKnowledgeBase();
        knowledgeBase = addCapture(knowledgeBase, { sourceType: "manual", content: "电影感逆光肖像" });
        knowledgeBase = addTermCandidate(knowledgeBase, { text: "逆光", sourceCaptureIds: [knowledgeBase.captures[0].id], browseCategory: "光线" });
        knowledgeBase = addTermCandidate(knowledgeBase, { text: "肖像", sourceCaptureIds: [knowledgeBase.captures[0].id], browseCategory: "主体" });
        knowledgeBase = addRecipeCandidate(knowledgeBase, { title: "逆光肖像", termIds: knowledgeBase.terms.map((item) => item.id), sourceCaptureIds: [knowledgeBase.captures[0].id] });
        knowledgeBase = addPromptCandidate(knowledgeBase, { title: "电影感肖像", content: "cinematic backlit portrait", recipeId: knowledgeBase.recipes[0].id, sourceCaptureIds: [knowledgeBase.captures[0].id] });

        expect(compileRuntimeLibrary(knowledgeBase).prompts).toEqual([]);

        knowledgeBase = setReviewState(knowledgeBase, "term", knowledgeBase.terms[0].id, "human_approved");
        knowledgeBase = setReviewState(knowledgeBase, "term", knowledgeBase.terms[1].id, "human_approved");
        knowledgeBase = setReviewState(knowledgeBase, "recipe", knowledgeBase.recipes[0].id, "human_approved");
        knowledgeBase = setReviewState(knowledgeBase, "prompt", knowledgeBase.prompts[0].id, "human_approved");

        expect(compileRuntimeLibrary(knowledgeBase)).toMatchObject({
            terms: [{ text: "逆光" }, { text: "肖像" }],
            recipes: [{ title: "逆光肖像" }],
            prompts: [{ title: "电影感肖像", content: "cinematic backlit portrait" }],
        });
    });

    it("rejects recipes containing fewer than two terms", () => {
        const knowledgeBase = createEmptyPromptKnowledgeBase();
        expect(() => addRecipeCandidate(knowledgeBase, { title: "无效配方", termIds: ["missing"], sourceCaptureIds: [] })).toThrow("至少需要两个有效词条");
    });

    it("merges normalized duplicate terms and keeps both source links", () => {
        let knowledgeBase = createEmptyPromptKnowledgeBase();
        knowledgeBase = addCapture(knowledgeBase, { sourceType: "manual", content: "first" });
        knowledgeBase = addCapture(knowledgeBase, { sourceType: "manual", content: "second" });
        knowledgeBase = addTermCandidate(knowledgeBase, { text: "  侧逆光  ", sourceCaptureIds: [knowledgeBase.captures[0].id], browseCategory: "光线" });
        knowledgeBase = addTermCandidate(knowledgeBase, { text: "侧逆光", sourceCaptureIds: [knowledgeBase.captures[1].id], browseCategory: "光线" });
        expect(knowledgeBase.terms).toHaveLength(1);
        expect(knowledgeBase.terms[0].sourceCaptureIds).toEqual(knowledgeBase.captures.map((item) => item.id));
        expect(knowledgeBase.captures.every((item) => item.derivedTermIds.length === 1 && item.status === "processed")).toBe(true);
    });

    it("blocks machine and human approval when references are invalid", () => {
        const knowledgeBase = {
            ...createEmptyPromptKnowledgeBase(),
            prompts: [{ id: "broken", title: "待修复", content: "prompt", sourceCaptureIds: [], reviewState: "pending" as const, validationErrors: ["迁移时原始收录引用缺失"], createdAt: "", updatedAt: "" }],
        };
        expect(validateReviewable(knowledgeBase, "prompt", "broken")).toContain("迁移时原始收录引用缺失");
        expect(() => setReviewState(knowledgeBase, "prompt", "broken", "machine_passed")).toThrow("校验失败");
        expect(() => setReviewState(knowledgeBase, "prompt", "broken", "human_approved")).toThrow("校验失败");
    });
});
