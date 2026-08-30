import assert from "node:assert/strict";
import test from "node:test";

import { resolvePromptReferenceFiles } from "./reference-files.js";
import type { FrameFlowImageAsset, FrameFlowReferenceAsset } from "./types.js";

const reference = (id: string): FrameFlowReferenceAsset => ({ id, source: { type: "browser_asset", id: `source-${id}`, name: `${id}.png` }, file: { relativePath: `references/${id}.png`, sha256: "hash", bytes: 1, mimeType: "image/png" }, width: 1, height: 1, createdAt: "2026-08-29T00:00:00.000Z" });
const image = (id: string): FrameFlowImageAsset => ({ id, runId: "run-1", promptVersionId: "prompt-1", referenceImageIds: [], file: { relativePath: `images/${id}.png`, sha256: "hash", bytes: 1, mimeType: "image/png" }, thumbnail: { relativePath: `thumbnails/${id}.png`, width: 1, height: 1 }, width: 1, height: 1, status: "pending_review", createdAt: "2026-08-29T00:00:00.000Z" });

test("提示词参考图按原有顺序解析，导入参考图优先于同 ID 的生成图", () => {
    const files = resolvePromptReferenceFiles({
        referenceImageIds: ["reference-1", "image-1", "shared"],
        references: { "reference-1": reference("reference-1"), shared: reference("shared") },
        images: { "image-1": image("image-1"), shared: image("shared") },
        referencePath: (item) => `/reference/${item.id}`,
        imagePath: (item) => `/image/${item.id}`,
        missing: (id) => new Error(`missing:${id}`),
    });

    assert.deepEqual(files, ["/reference/reference-1", "/image/image-1", "/reference/shared"]);
});

test("未登记的提示词参考图仍由调用方以领域错误拒绝", () => {
    assert.throws(() => resolvePromptReferenceFiles({
        referenceImageIds: ["missing"],
        references: {},
        images: {},
        referencePath: (item) => `/reference/${item.id}`,
        imagePath: (item) => `/image/${item.id}`,
        missing: (id) => new Error(`参考图尚未登记到 FrameFlow：${id}`),
    }), /参考图尚未登记到 FrameFlow：missing/);
});
