import assert from "node:assert/strict";
import test from "node:test";

import { AutoRunIterationEventError, autoRunIterationEvents } from "./auto-run-iteration-events.js";
import type { AutoRun, FrameFlowEvent, PromptVersion } from "./types.js";

const autoRun = (): Pick<AutoRun, "id" | "briefId" | "iteration" | "count"> => ({ id: "auto-run", briefId: "brief", iteration: 1, count: 2 });
const promptCreated = (): Extract<FrameFlowEvent, { type: "prompt.version_created" }> => ({ type: "prompt.version_created", eventId: "prompt-event", promptVersion: { id: "prompt" } as PromptVersion });

test("autoRunIterationEvents 将规划 Prompt 转为批准、固定槽位 Run 与迭代开始事件", () => {
    const createId = (() => { let index = 0; return () => `id-${++index}`; })();
    const events = autoRunIterationEvents({ planned: [promptCreated()], autoRun: autoRun(), occurredAt: "2026-08-29T00:00:00.000Z", createId });

    assert.deepEqual(events.map((event) => event.type), ["prompt.version_created", "prompt.approved", "run.queued", "run.started", "auto_run.iteration_started"]);
    assert.deepEqual(events[1], { type: "prompt.approved", eventId: "id-4", promptVersionId: "prompt", locks: {} });
    assert.deepEqual(events[2], expectRunQueued("id-1", ["id-2", "id-3"]));
    assert.deepEqual(events[4], { type: "auto_run.iteration_started", eventId: "id-7", autoRunId: "auto-run", iteration: 2, runId: "id-1", startedAt: "2026-08-29T00:00:00.000Z" });
});

test("autoRunIterationEvents 拒绝没有 Prompt Version 的规划结果", () => {
    assert.throws(() => autoRunIterationEvents({ planned: [], autoRun: autoRun(), occurredAt: "2026-08-29T00:00:00.000Z", createId: () => "id" }), AutoRunIterationEventError);
});

function expectRunQueued(runId: string, slotIds: string[]) {
    return {
        type: "run.queued",
        eventId: "id-5",
        run: {
            id: runId,
            briefId: "brief",
            promptVersionId: "prompt",
            slotIds,
            status: "queued",
            requestedCount: 2,
            imageIds: [],
            createdAt: "2026-08-29T00:00:00.000Z",
        },
    };
}
