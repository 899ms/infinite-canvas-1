import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createEmptyPromptKnowledgeBase } from "./domain";
import { createMigrationExport, exportMigrationSnapshot, importMigrationSnapshot } from "./import-export";

it("imports FrameFlow shaped data with remapped references and reports repeated imports", () => {
    const raw = JSON.stringify({
        captures: [{ id: "capture-old", sourceText: "portrait in side light", sourceType: "manual", sourceLabel: "FrameFlow" }],
        terms: [
            { id: "term-a", label: "侧光", category: "光线", visualDuty: "塑造体积", sourceCaptureIds: ["capture-old"], reviewState: "human_approved" },
            { id: "term-b", label: "肖像", category: "主体", visualDuty: "主体", sourceCaptureIds: ["capture-old"], reviewState: "human_approved" },
        ],
        recipes: [{ id: "recipe-old", title: "侧光肖像", termIds: ["term-a", "term-b"], sourceCaptureIds: ["capture-old"], reviewState: "human_approved" }],
        prompts: [{ id: "prompt-old", title: "肖像", content: "portrait", sourceCaptureIds: ["capture-old"], reviewState: "human_approved" }],
    });
    const first = importMigrationSnapshot(raw);
    expect(first.report).toMatchObject({ added: 5, conflicts: 0, failed: 0 });
    expect(first.knowledgeBase.recipes[0].termIds).toHaveLength(2);
    const repeated = importMigrationSnapshot(raw, first.knowledgeBase);
    expect(repeated.knowledgeBase.terms).toHaveLength(2);
    expect(repeated.report.skipped).toBeGreaterThan(0);
});

it("exports a versioned migration snapshot", () => {
    const snapshot = JSON.parse(exportMigrationSnapshot(createEmptyPromptKnowledgeBase(), [], {}));
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.knowledgeBase.version).toBe(1);
});

it("creates a verified migration export that can be imported", () => {
    const result = createMigrationExport(createEmptyPromptKnowledgeBase(), [], {});
    expect(result.receipt).toMatchObject({ fileName: "infinite-canvas-prompt-migration.json", captures: 0, terms: 0, recipes: 0, prompts: 0, templates: 0, feedback: 0, verified: true });
    expect(result.receipt.bytes).toBeGreaterThan(0);
    expect(importMigrationSnapshot(result.json).report.failed).toBe(0);
});

it("keeps entries with missing references as pending repair items", () => {
    const imported = importMigrationSnapshot(
        JSON.stringify({
            captures: [],
            terms: [{ id: "term-missing", label: "侧光", category: "光线", sourceCaptureIds: ["missing"] }],
            recipes: [{ id: "recipe-missing", title: "缺引用配方", termIds: ["term-missing", "other"], sourceCaptureIds: ["missing"] }],
            prompts: [{ id: "prompt-missing", title: "缺引用提示词", content: "portrait", sourceCaptureIds: ["missing"], recipeId: "recipe-missing" }],
        }),
    );
    expect(imported.report.conflicts).toBe(3);
    expect(imported.knowledgeBase.terms).toHaveLength(1);
    expect(imported.knowledgeBase.recipes).toHaveLength(1);
    expect(imported.knowledgeBase.prompts).toHaveLength(1);
    expect(imported.knowledgeBase.prompts[0]).toMatchObject({ reviewState: "pending", validationErrors: ["迁移时原始收录引用缺失"] });
});

it("imports the checked-in QA migration fixture with approved lineage intact", () => {
    const raw = readFileSync(new URL("../../../qa-fixtures/prompt-migration.json", import.meta.url), "utf8");
    const imported = importMigrationSnapshot(raw);

    expect(imported.report).toMatchObject({ added: 5, conflicts: 0, failed: 0 });
    expect(imported.knowledgeBase.captures).toHaveLength(1);
    expect(imported.knowledgeBase.terms).toHaveLength(2);
    expect(imported.knowledgeBase.recipes).toHaveLength(1);
    expect(imported.knowledgeBase.prompts).toHaveLength(1);
    expect(imported.knowledgeBase.terms.every((term) => term.reviewState === "human_approved" && term.sourceCaptureIds.length === 1)).toBe(true);
    expect(imported.knowledgeBase.recipes[0]).toMatchObject({ reviewState: "human_approved" });
    expect(imported.knowledgeBase.recipes[0].termIds).toHaveLength(2);
    expect(imported.knowledgeBase.recipes[0].sourceCaptureIds).toHaveLength(1);
    expect(imported.knowledgeBase.prompts[0]).toMatchObject({ reviewState: "human_approved", recipeId: imported.knowledgeBase.recipes[0].id });
    expect(imported.knowledgeBase.prompts[0].sourceCaptureIds).toHaveLength(1);
    expect(imported.promptFillTemplates).toMatchObject([{ id: "qa-template", custom: true }]);
});
