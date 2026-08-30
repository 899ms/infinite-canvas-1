import assert from "node:assert/strict";
import test from "node:test";

import { runFinalizationPlan } from "./run-finalization.js";
import type { FrameFlowImageAsset } from "./types.js";

const occurredAt = "2026-08-29T00:00:00.000Z";

const image = (id: string): FrameFlowImageAsset => ({
    id,
    runId: "run-1",
    promptVersionId: "prompt-1",
    referenceImageIds: [],
    file: { relativePath: `assets/originals/${id}.png`, sha256: "a".repeat(64), bytes: 1, mimeType: "image/png" },
    thumbnail: { relativePath: `assets/originals/${id}.png`, width: 1, height: 1 },
    width: 1,
    height: 1,
    status: "pending_review",
    createdAt: occurredAt,
});

test("缺失结果保留已有成功槽位，并把自动跑转入审图", () => {
    const plan = runFinalizationPlan({
        run: { id: "run-1", requestedCount: 2, slotIds: ["slot-1", "slot-2"] },
        slots: { "slot-1": { status: "succeeded" }, "slot-2": { status: "running" } },
        slotIds: ["slot-2"],
        images: [],
        autoRun: { id: "auto-1", state: "generating" },
        occurredAt,
    });

    assert.equal(plan.totalSucceeded, 1);
    assert.equal(plan.status, "partially_succeeded");
    assert.equal(plan.reviewAutoRunId, "auto-1");
    assert.deepEqual(plan.events.map((event) => event.type), ["run.slot_failed", "run.completed", "auto_run.review_started"]);
    assert.equal(plan.events[0]?.type === "run.slot_failed" && plan.events[0].error.code, "IMAGEGEN_MISSING_RESULT");
});

test("新增图片补齐全部槽位时，生成成功事件与图片登记一一对应", () => {
    const plan = runFinalizationPlan({
        run: { id: "run-1", requestedCount: 2, slotIds: ["slot-1", "slot-2"] },
        slots: { "slot-1": { status: "succeeded" }, "slot-2": { status: "running" } },
        slotIds: ["slot-2"],
        images: [image("image-2")],
        autoRun: { id: "auto-1", state: "generating" },
        occurredAt,
    });

    assert.equal(plan.totalSucceeded, 2);
    assert.equal(plan.status, "succeeded");
    assert.equal(plan.reviewAutoRunId, "auto-1");
    assert.deepEqual(plan.events.map((event) => event.type), ["run.slot_succeeded", "image.registered", "run.completed", "auto_run.review_started"]);
});

test("已暂停的自动跑仍审核已完成图片，但不重写自动跑状态", () => {
    const plan = runFinalizationPlan({
        run: { id: "run-1", requestedCount: 1, slotIds: ["slot-1"] },
        slots: { "slot-1": { status: "running" } },
        slotIds: ["slot-1"],
        images: [image("image-1")],
        autoRun: { id: "auto-1", state: "paused" },
        occurredAt,
    });

    assert.equal(plan.reviewAutoRunId, "auto-1");
    assert.deepEqual(plan.events.map((event) => event.type), ["run.slot_succeeded", "image.registered", "run.completed"]);
});
