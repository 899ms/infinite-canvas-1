import assert from "node:assert/strict";
import test from "node:test";

import { GenerationCommandError, generationCommandEvents } from "./generation-command-events.js";
import type { GenerationRun, GenerationSlot, PromptVersion } from "./types.js";

const prompt = (status: PromptVersion["status"] = "approved"): PromptVersion => ({ id: "prompt-1", briefId: "brief-1", revision: 1, status, fields: { subject: [], composition: [], color: [], lighting: [], material: [], layout: [], mood: [], rendering: [], technical: [], negative: [] }, compiledPrompt: "prompt", diff: { keep: [], add: [], change: [], remove: [], avoid: [] }, referenceImageIds: [], locks: {}, reason: "reason", createdAt: "2026-08-29T00:00:00.000Z" });
const run = (overrides: Partial<GenerationRun> = {}): GenerationRun => ({ id: "run-1", briefId: "brief-1", promptVersionId: "prompt-1", status: "failed", requestedCount: 2, slotIds: ["slot-1", "slot-2"], imageIds: ["image-1"], createdAt: "2026-08-29T00:00:00.000Z", ...overrides });
const slots: Record<string, GenerationSlot> = {
    "slot-1": { id: "slot-1", runId: "run-1", index: 0, status: "succeeded", attempts: 1, imageId: "image-1" },
    "slot-2": { id: "slot-2", runId: "run-1", index: 1, status: "failed", attempts: 1, error: { code: "IMAGEGEN_FAILED", message: "failed", retryable: true } },
};

test("已批准 Prompt 创建完整的排队与开始 Run 事件", () => {
    const events = generationCommandEvents({ command: { type: "run.start", promptVersionId: "prompt-1", count: 2, idempotencyKey: "start" }, prompt: prompt(), imageGeneratorConfigured: true, slots, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event-1", createId: (() => { let index = 0; return () => `id-${++index}`; })() });

    assert.deepEqual(events, [
        { type: "run.queued", eventId: "event-1", run: { id: "id-1", briefId: "brief-1", promptVersionId: "prompt-1", status: "queued", requestedCount: 2, slotIds: ["id-2", "id-3"], imageIds: [], createdAt: "2026-08-29T00:00:00.000Z" } },
        { type: "run.started", eventId: "id-4", runId: "id-1", startedAt: "2026-08-29T00:00:00.000Z" },
    ]);
});

test("失败 slot 重试和活动 Run 取消各自保留最小事件", () => {
    const retried = generationCommandEvents({ command: { type: "run.retry", runId: "run-1", failedSlotIds: ["slot-2"], idempotencyKey: "retry" }, run: run(), prompt: prompt(), imageGeneratorConfigured: true, slots, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event-retry", createId: () => "unused" });
    const cancelled = generationCommandEvents({ command: { type: "run.cancel", runId: "run-1", idempotencyKey: "cancel" }, run: run({ status: "running" }), imageGeneratorConfigured: true, slots, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event-cancel", createId: () => "unused" });

    assert.deepEqual(retried, [{ type: "run.retry_started", eventId: "event-retry", runId: "run-1", slotIds: ["slot-2"], startedAt: "2026-08-29T00:00:00.000Z" }]);
    assert.deepEqual(cancelled, [{ type: "run.cancelled", eventId: "event-cancel", runId: "run-1", cancelledAt: "2026-08-29T00:00:00.000Z", reason: "user_requested" }]);
});

test("未批准 Prompt、重复失败 slot 与结束 Run 均被拒绝", () => {
    assert.throws(() => generationCommandEvents({ command: { type: "run.start", promptVersionId: "prompt-1", count: 1, idempotencyKey: "start" }, prompt: prompt("draft"), imageGeneratorConfigured: true, slots, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event", createId: () => "id" }), (error: unknown) => error instanceof GenerationCommandError && error.message === "只有已批准 Prompt 才能开始生成");
    assert.throws(() => generationCommandEvents({ command: { type: "run.retry", runId: "run-1", failedSlotIds: ["slot-2", "slot-2"], idempotencyKey: "retry" }, run: run(), prompt: prompt(), imageGeneratorConfigured: true, slots, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event", createId: () => "id" }), /失败 slot 不可重复/);
    assert.throws(() => generationCommandEvents({ command: { type: "run.cancel", runId: "run-1", idempotencyKey: "cancel" }, run: run({ status: "succeeded" }), imageGeneratorConfigured: true, slots, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event", createId: () => "id" }), /只有生成中的 Run 可以取消/);
});
