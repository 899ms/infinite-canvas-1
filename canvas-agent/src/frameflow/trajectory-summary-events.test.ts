import assert from "node:assert/strict";
import test from "node:test";

import { TrajectorySummaryEventError, trajectorySummaryEvent } from "./trajectory-summary-events.js";
import type { AutoRunTrajectorySummaryDraft } from "./types.js";

const draft = (overrides: Partial<AutoRunTrajectorySummaryDraft> = {}): AutoRunTrajectorySummaryDraft => ({
    improved: [{ issue: "主体更明确", evidenceIterations: [2], explanation: "第二轮强化主体" }],
    recurring: [{ issue: "背景杂乱", evidenceIterations: [1, 2], recommendation: "降低背景信息密度" }],
    bestIteration: 2,
    bestReason: "构图最完整",
    ...overrides,
});

test("trajectorySummaryEvent 保留验证后的总结及可回放事件", () => {
    const result = trajectorySummaryEvent({ autoRunId: "auto-run", throughIteration: 2, reviewedIterations: new Set([1, 2]), createdAt: "2026-08-29T00:00:00.000Z", draft: draft(), eventId: "event" });

    assert.deepEqual(result.summary, { ...draft(), autoRunId: "auto-run", throughIteration: 2, createdAt: "2026-08-29T00:00:00.000Z" });
    assert.deepEqual(result.event, { type: "auto_run.trajectory_summarized", eventId: "event", summary: result.summary });
});

test("trajectorySummaryEvent 拒绝不存在的最佳轮次或证据轮次", () => {
    const input = { autoRunId: "auto-run", throughIteration: 2, reviewedIterations: new Set([1, 2]), createdAt: "2026-08-29T00:00:00.000Z", eventId: "event" };

    assert.throws(() => trajectorySummaryEvent({ ...input, draft: draft({ bestIteration: 3 }) }), TrajectorySummaryEventError);
    assert.throws(() => trajectorySummaryEvent({ ...input, draft: draft({ recurring: [{ issue: "背景杂乱", evidenceIterations: [3], recommendation: "降低背景信息密度" }] }) }), TrajectorySummaryEventError);
});
