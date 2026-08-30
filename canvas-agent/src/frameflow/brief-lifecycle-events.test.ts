import assert from "node:assert/strict";
import test from "node:test";

import { archiveBriefEvent, createBriefEvent, restoreBriefEvent, reviseBriefEvents } from "./brief-lifecycle-events.js";
import type { AutoRun, CreativeBrief, CreativeBriefInput } from "./types.js";

const input: CreativeBriefInput = { subject: "glass", aspectRatio: "1:1", constraints: { keep: ["blue"], avoid: [] }, referenceImageIds: [], strategy: "balanced" };
const brief = (overrides: Partial<CreativeBrief> = {}): CreativeBrief => ({ id: "brief-1", requirementId: "requirement-1", revision: 2, subject: "old", purpose: "old purpose", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "stable", profileId: "brief-1", createdAt: "2026-08-29T00:00:00.000Z", ...overrides });
const autoRun = (): AutoRun => ({ id: "auto-run-1", name: "探索", briefId: "brief-1", count: 2, maxIterations: 3, state: "completed", iteration: 3, createdAt: "2026-08-29T00:00:00.000Z", updatedAt: "2026-08-29T00:00:00.000Z" });

test("创建 Brief 会填充 Requirement、默认用途和稳定事件字段", () => {
    assert.deepEqual(createBriefEvent({ input, briefId: "brief-new", eventId: "event-create", occurredAt: "2026-08-29T01:00:00.000Z" }), [{ type: "brief.created", eventId: "event-create", brief: { id: "brief-new", requirementId: "brief-new", revision: 1, ...input, purpose: "审美训练与灵感采集", profileId: "brief-new", createdAt: "2026-08-29T01:00:00.000Z" } }]);
});

test("修订 Brief 可创建同一血缘的暂停 Auto Run", () => {
    const events = reviseBriefEvents({ source: brief(), input: { ...input, purpose: "  新用途  " }, sourceAutoRun: autoRun(), briefId: "brief-new", autoRunId: "auto-run-new", eventId: "event-revise", autoRunEventId: "event-auto", occurredAt: "2026-08-29T01:00:00.000Z" });

    assert.deepEqual(events, [
        { type: "brief.revised", eventId: "event-revise", sourceBriefId: "brief-1", supersededAt: "2026-08-29T01:00:00.000Z", brief: { id: "brief-new", requirementId: "requirement-1", revision: 3, supersedesBriefId: "brief-1", ...input, purpose: "新用途", profileId: "brief-new", createdAt: "2026-08-29T01:00:00.000Z" } },
        { type: "auto_run.created", eventId: "event-auto", autoRun: { id: "auto-run-new", name: "探索 · 修订 3", briefId: "brief-new", count: 2, maxIterations: 3, state: "paused", iteration: 0, createdAt: "2026-08-29T01:00:00.000Z", updatedAt: "2026-08-29T01:00:00.000Z" } },
    ]);
});

test("归档和恢复使用当前 Requirement 身份", () => {
    assert.deepEqual(archiveBriefEvent({ brief: brief(), eventId: "event-archive", occurredAt: "2026-08-29T01:00:00.000Z" }), [{ type: "brief.archived", eventId: "event-archive", briefId: "brief-1", requirementId: "requirement-1", archivedAt: "2026-08-29T01:00:00.000Z" }]);
    assert.deepEqual(restoreBriefEvent({ brief: brief(), eventId: "event-restore", occurredAt: "2026-08-29T01:00:00.000Z" }), [{ type: "brief.restored", eventId: "event-restore", briefId: "brief-1", requirementId: "requirement-1", restoredAt: "2026-08-29T01:00:00.000Z" }]);
});
