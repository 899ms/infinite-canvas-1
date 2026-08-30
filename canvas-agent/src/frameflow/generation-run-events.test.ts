import assert from "node:assert/strict";
import test from "node:test";

import { queueGenerationRun } from "./generation-run-events.js";

test("排队生成同时记录可追溯的 Run 与开始事件", () => {
    const events = queueGenerationRun({
        runId: "run-1",
        briefId: "brief-1",
        promptVersionId: "prompt-1",
        count: 2,
        slotIds: ["slot-1", "slot-2"],
        occurredAt: "2026-08-29T00:00:00.000Z",
        queuedEventId: "queued-1",
        startedEventId: "started-1",
    });

    assert.deepEqual(events, [
        { type: "run.queued", eventId: "queued-1", run: { id: "run-1", briefId: "brief-1", promptVersionId: "prompt-1", status: "queued", requestedCount: 2, slotIds: ["slot-1", "slot-2"], imageIds: [], createdAt: "2026-08-29T00:00:00.000Z" } },
        { type: "run.started", eventId: "started-1", runId: "run-1", startedAt: "2026-08-29T00:00:00.000Z" },
    ]);
});
