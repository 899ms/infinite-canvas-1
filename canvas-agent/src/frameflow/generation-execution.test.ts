import assert from "node:assert/strict";
import test from "node:test";

import { executeImageGeneration } from "./generation-execution.js";
import type { FrameFlowImageAsset, PromptVersion } from "./types.js";

const prompt: PromptVersion = {
    id: "prompt-1",
    briefId: "brief-1",
    revision: 1,
    source: "agent",
    displayLanguage: "en",
    prompt: "ceramic sphere",
    referenceImageIds: ["reference-1"],
    locks: {},
    diff: { kept: [], added: [], changed: [], removed: [], avoided: [], evidence: [] },
    createdAt: "2026-08-29T00:00:00.000Z",
};

const image = (id: string): FrameFlowImageAsset => ({
    id,
    runId: "run-1",
    promptVersionId: prompt.id,
    referenceImageIds: [],
    file: { relativePath: `assets/originals/${id}.png`, sha256: "a".repeat(64), bytes: 1, mimeType: "image/png" },
    thumbnail: { relativePath: `assets/originals/${id}.png`, width: 1, height: 1 },
    width: 1,
    height: 1,
    status: "pending_review",
    createdAt: "2026-08-29T00:00:00.000Z",
});

const input = (overrides: Partial<Parameters<typeof executeImageGeneration>[0]> = {}) => ({
    generator: { generate: async () => ["one.png", "two.png", "extra.png"] },
    assets: {
        importGenerated: async () => [image("image-1"), image("image-2")],
        quarantineGenerated: async () => undefined,
    },
    prompt,
    aspectRatio: "1:1",
    cropPosition: "attention" as const,
    runId: "run-1",
    slotIds: ["slot-1", "slot-2"],
    referenceFiles: ["reference.png"],
    signal: new AbortController().signal,
    now: () => "2026-08-29T00:01:00.000Z",
    ...overrides,
});

test("Provider 失败时返回可重试的生成失败收尾，而不触碰资产", async () => {
    let assetCalls = 0;
    const result = await executeImageGeneration(input({
        generator: { generate: async () => { throw new Error("offline"); } },
        assets: {
            importGenerated: async () => { assetCalls += 1; return []; },
            quarantineGenerated: async () => { assetCalls += 1; },
        },
    }));

    assert.deepEqual(result, { type: "finalize", images: [], error: { code: "IMAGEGEN_FAILED", message: "Codex ImageGen 生成失败，可重试该 slot", retryable: true } });
    assert.equal(assetCalls, 0);
});

test("取消后的迟到文件全部隔离，且不再导入或收尾", async () => {
    const controller = new AbortController();
    const quarantined: string[][] = [];
    const result = await executeImageGeneration(input({
        generator: { generate: async () => { controller.abort(); return ["late.png"]; } },
        assets: {
            importGenerated: async () => { throw new Error("must not import"); },
            quarantineGenerated: async (files) => { quarantined.push(files); },
        },
        signal: controller.signal,
    }));

    assert.deepEqual(result, { type: "discarded" });
    assert.deepEqual(quarantined, [["late.png"]]);
});

test("未取消时只导入固定槽位并隔离超量文件，导入图片继承参考图", async () => {
    const imported: string[][] = [];
    const quarantined: Array<{ files: string[]; reason: string }> = [];
    const result = await executeImageGeneration(input({
        assets: {
            importGenerated: async (files) => { imported.push(files); return [image("image-1"), image("image-2")]; },
            quarantineGenerated: async (files, details) => { quarantined.push({ files, reason: details.reason }); },
        },
    }));

    assert.deepEqual(imported, [["one.png", "two.png"]]);
    assert.deepEqual(quarantined, [{ files: ["extra.png"], reason: "orphan_recovery" }]);
    assert.equal(result.type, "finalize");
    assert.deepEqual(result.images.map((item) => item.referenceImageIds), [["reference-1"], ["reference-1"]]);
});

test("资产导入失败时隔离原始文件并返回 PNG 校验失败收尾", async () => {
    const quarantined: Array<{ files: string[]; reason: string }> = [];
    const result = await executeImageGeneration(input({
        assets: {
            importGenerated: async () => { throw new Error("invalid png"); },
            quarantineGenerated: async (files, details) => { quarantined.push({ files, reason: details.reason }); },
        },
    }));

    assert.deepEqual(quarantined, [{ files: ["one.png", "two.png", "extra.png"], reason: "asset_import_failed" }]);
    assert.deepEqual(result, { type: "finalize", images: [], error: { code: "IMAGE_VALIDATION_FAILED", message: "ImageGen 返回的图片未通过 PNG 校验，可重试该 slot", retryable: true } });
});
