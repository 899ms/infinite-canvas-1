import assert from "node:assert/strict";
import test from "node:test";

import { MachineReviewExecutionError, executeMachineReview } from "./machine-review-execution.js";
import type { AutoRun, CreativeBrief, FrameFlowImageAsset, GenerationRun, MachineReview, PromptVersion } from "./types.js";

const brief = { id: "brief-1" } as CreativeBrief;
const prompt = { id: "prompt-1" } as PromptVersion;
const autoRun = { id: "auto-run", iteration: 2 } as Pick<AutoRun, "id" | "iteration">;
const run = { id: "run-1", imageIds: ["image-a", "image-b"] } as Pick<GenerationRun, "id" | "imageIds">;
const image = (id: string) => ({ id }) as FrameFlowImageAsset;
const review = (imageId: string): Omit<MachineReview, "autoRunId" | "runId" | "iteration" | "createdAt"> => ({ imageId, rating: 4, comment: "构图稳定", decision: "keep", strengths: ["光线"], issues: [] });

test("只把当前 Run 中尚未审图的图片交给 Reviewer，并返回经过 schema 校验的结果", async () => {
    const received: Array<{ imageId: string; filePath: string }> = [];
    const result = await executeMachineReview({
        reviewer: { review: async ({ images }) => { received.push(...images); return [review("image-b")]; } },
        brief,
        prompt,
        autoRun,
        run,
        images: { "image-a": image("image-a"), "image-b": image("image-b") },
        reviewedImageIds: new Set(["image-a"]),
        imagePath: (item) => `C:/assets/${item.id}.png`,
    });

    assert.deepEqual(received, [{ imageId: "image-b", filePath: "C:/assets/image-b.png" }]);
    assert.deepEqual(result, { type: "reviewed", pendingImageIds: ["image-b"], reviews: [review("image-b")] });
});

test("全部图片已有机器审图时不调用 Reviewer", async () => {
    const result = await executeMachineReview({
        reviewer: { review: async () => { throw new Error("must not review"); } },
        brief,
        prompt,
        autoRun,
        run,
        images: { "image-a": image("image-a"), "image-b": image("image-b") },
        reviewedImageIds: new Set(["image-a", "image-b"]),
        imagePath: () => "unused",
    });

    assert.deepEqual(result, { type: "already_reviewed" });
});

test("Run 引用缺失图片时拒绝发起机器审图", async () => {
    await assert.rejects(() => executeMachineReview({
        reviewer: { review: async () => [] },
        brief,
        prompt,
        autoRun,
        run,
        images: { "image-a": image("image-a") },
        reviewedImageIds: new Set(),
        imagePath: () => "unused",
    }), (error: unknown) => error instanceof MachineReviewExecutionError && error.statusCode === 404 && error.message === "找不到机器审图图片：image-b");
});
