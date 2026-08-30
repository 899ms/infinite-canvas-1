import assert from "node:assert/strict";
import test from "node:test";

import { postCommitEffect } from "./post-commit-effect.js";
import type { AutoRun, FrameFlowCommand, FrameFlowEvent } from "./types.js";

const queued = (runId = "run-1"): FrameFlowEvent => ({ type: "run.queued", eventId: "event-1", run: { id: runId, briefId: "brief-1", promptVersionId: "prompt-1", status: "queued", requestedCount: 1, slotIds: ["slot-1"], imageIds: [], createdAt: "2026-08-29T00:00:00.000Z" } });
const autoRun = (overrides: Partial<AutoRun> = {}): AutoRun => ({ id: "auto-1", name: "自动跑", briefId: "brief-1", count: 1, maxIterations: 2, state: "generating", iteration: 0, createdAt: "2026-08-29T00:00:00.000Z", updatedAt: "2026-08-29T00:00:00.000Z", ...overrides });

test("提交后优先恢复已记录的审图或生成动作", () => {
    const reviewEvent: FrameFlowEvent = { type: "auto_run.review_started", eventId: "event-review", autoRunId: "auto-1", runId: "run-review", startedAt: "2026-08-29T00:00:00.000Z" };
    const review = postCommitEffect({ command: { type: "auto_run.start", autoRunId: "auto-1", idempotencyKey: "start" }, events: [reviewEvent, queued()] });
    const generation = postCommitEffect({ command: { type: "run.start", promptVersionId: "prompt-1", count: 1, idempotencyKey: "run" }, events: [queued()] });

    assert.deepEqual(review, { type: "machine_review.launch", autoRunId: "auto-1", runId: "run-review" });
    assert.deepEqual(generation, { type: "generation.launch", runId: "run-1", promptVersionId: "prompt-1", slotIds: ["slot-1"] });
});

test("没有 Run 的生成态自动跑会继续规划，取消和重试保留各自动作", () => {
    const planning = postCommitEffect({ command: { type: "auto_run.advance", autoRunId: "auto-1", idempotencyKey: "advance" }, events: [], autoRun: autoRun() });
    const cancel = postCommitEffect({ command: { type: "run.cancel", runId: "run-1", idempotencyKey: "cancel" }, events: [] });
    const retryEvent: FrameFlowEvent = { type: "run.retry_started", eventId: "retry-1", runId: "run-1", slotIds: ["slot-2"], startedAt: "2026-08-29T00:00:00.000Z" };
    const retry = postCommitEffect({ command: { type: "run.retry", runId: "run-1", failedSlotIds: ["slot-2"], idempotencyKey: "retry" }, events: [retryEvent] });

    assert.deepEqual(planning, { type: "auto_run_planning.launch", autoRunId: "auto-1" });
    assert.deepEqual(cancel, { type: "run.abort", runId: "run-1" });
    assert.deepEqual(retry, { type: "generation.retry", runId: "run-1", slotIds: ["slot-2"] });
});
