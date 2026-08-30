import assert from "node:assert/strict";
import test from "node:test";

import { AutoRunCommandError, autoRunCommandEvents } from "./auto-run-command-events.js";
import type { AutoRun, GenerationRun, MachineReview } from "./types.js";

const autoRun = (overrides: Partial<AutoRun> = {}): AutoRun => ({ id: "auto-1", name: "探索", briefId: "brief-1", count: 2, maxIterations: 2, state: "paused", iteration: 0, createdAt: "2026-08-29T00:00:00.000Z", updatedAt: "2026-08-29T00:00:00.000Z", ...overrides });
const run = (overrides: Partial<GenerationRun> = {}): GenerationRun => ({ id: "run-1", briefId: "brief-1", promptVersionId: "prompt-1", status: "succeeded", requestedCount: 2, slotIds: ["slot-1", "slot-2"], imageIds: ["image-1", "image-2"], createdAt: "2026-08-29T00:00:00.000Z", ...overrides });
const reviewed: Record<string, MachineReview> = {
    "image-1": { imageId: "image-1", autoRunId: "auto-1", runId: "run-1", iteration: 1, rating: 4, comment: "good", decision: "vary", strengths: [], issues: [], createdAt: "2026-08-29T00:00:00.000Z" },
    "image-2": { imageId: "image-2", autoRunId: "auto-1", runId: "run-1", iteration: 1, rating: 4, comment: "good", decision: "vary", strengths: [], issues: [], createdAt: "2026-08-29T00:00:00.000Z" },
};

test("开始自动跑会恢复未完成生成、转入缺失审图或继续规划", () => {
    const resumed = autoRunCommandEvents({ command: { type: "auto_run.start", autoRunId: "auto-1", idempotencyKey: "start" }, autoRun: autoRun({ currentRunId: "run-1" }), currentRun: run({ status: "running" }), imageReviewerConfigured: true, machineReviewsByImage: {}, canContinueExploration: false, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event-1" });
    const reviewing = autoRunCommandEvents({ command: { type: "auto_run.start", autoRunId: "auto-1", idempotencyKey: "start" }, autoRun: autoRun({ currentRunId: "run-1", iteration: 1 }), currentRun: run(), imageReviewerConfigured: true, machineReviewsByImage: { "image-1": reviewed["image-1"]! }, canContinueExploration: false, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event-2" });
    const planning = autoRunCommandEvents({ command: { type: "auto_run.start", autoRunId: "auto-1", idempotencyKey: "start" }, autoRun: autoRun(), imageReviewerConfigured: true, machineReviewsByImage: {}, canContinueExploration: false, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event-3" });

    assert.deepEqual(resumed, [{ type: "auto_run.updated", eventId: "event-1", autoRun: { ...autoRun({ currentRunId: "run-1" }), state: "generating", updatedAt: "2026-08-29T00:00:00.000Z" } }]);
    assert.deepEqual(reviewing, [{ type: "auto_run.review_started", eventId: "event-2", autoRunId: "auto-1", runId: "run-1", startedAt: "2026-08-29T00:00:00.000Z" }]);
    assert.deepEqual(planning, [{ type: "auto_run.updated", eventId: "event-3", autoRun: { ...autoRun(), state: "generating", lastStartedAt: "2026-08-29T00:00:00.000Z", updatedAt: "2026-08-29T00:00:00.000Z" } }]);
});

test("停止、继续探索与审图推进保持各自的状态限制", () => {
    const stopped = autoRunCommandEvents({ command: { type: "auto_run.stop", autoRunId: "auto-1", idempotencyKey: "stop" }, autoRun: autoRun({ state: "reviewing" }), imageReviewerConfigured: true, machineReviewsByImage: {}, canContinueExploration: false, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event-stop" });
    const extended = autoRunCommandEvents({ command: { type: "auto_run.extend", autoRunId: "auto-1", additionalIterations: 1, idempotencyKey: "extend" }, autoRun: autoRun({ state: "completed", iteration: 2 }), imageReviewerConfigured: true, machineReviewsByImage: reviewed, canContinueExploration: true, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event-extend" });
    const advanced = autoRunCommandEvents({ command: { type: "auto_run.advance", autoRunId: "auto-1", idempotencyKey: "advance" }, autoRun: autoRun({ state: "reviewing", currentRunId: "run-1", iteration: 1 }), currentRun: run(), imageReviewerConfigured: true, machineReviewsByImage: reviewed, canContinueExploration: false, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event-advance" });

    assert.deepEqual(stopped, [{ type: "auto_run.paused", eventId: "event-stop", autoRunId: "auto-1", pausedAt: "2026-08-29T00:00:00.000Z", reason: "user_requested" }]);
    assert.deepEqual(extended, [{ type: "auto_run.extended", eventId: "event-extend", autoRunId: "auto-1", previousMaxIterations: 2, maxIterations: 3, additionalIterations: 1, extendedAt: "2026-08-29T00:00:00.000Z" }]);
    const { currentRunId: _currentRunId, lastError: _lastError, ...plannedAutoRun } = autoRun({ state: "reviewing", currentRunId: "run-1", iteration: 1 });
    assert.deepEqual(advanced, [{ type: "auto_run.updated", eventId: "event-advance", autoRun: { ...plannedAutoRun, state: "generating", lastStartedAt: "2026-08-29T00:00:00.000Z", updatedAt: "2026-08-29T00:00:00.000Z" } }]);
});

test("非法状态与并发自动跑会被领域错误拒绝", () => {
    assert.throws(() => autoRunCommandEvents({ command: { type: "auto_run.stop", autoRunId: "auto-1", idempotencyKey: "stop" }, autoRun: autoRun(), imageReviewerConfigured: true, machineReviewsByImage: {}, canContinueExploration: false, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event" }), (error: unknown) => error instanceof AutoRunCommandError && error.statusCode === 409 && error.message === "只有正在生成或机器审图的自动跑可以停止");
    assert.throws(() => autoRunCommandEvents({ command: { type: "auto_run.start", autoRunId: "auto-1", idempotencyKey: "start" }, autoRun: autoRun(), otherActiveAutoRun: autoRun({ id: "auto-2", name: "占用" , state: "generating" }), imageReviewerConfigured: true, machineReviewsByImage: {}, canContinueExploration: false, occurredAt: "2026-08-29T00:00:00.000Z", eventId: "event" }), /请先停止正在运行的“占用”/);
});
