import assert from "node:assert/strict";
import test from "node:test";

import { emptyProjection } from "./reducer.js";
import { staleRunRecoveryTransaction } from "./recovery.js";

test("重启恢复只取消未结束 Run，并写入可追溯的系统原因", () => {
    const projection = emptyProjection();
    projection.sequence = 7;
    projection.runs = {
        queued: { id: "queued", status: "queued" },
        running: { id: "running", status: "running" },
        retrying: { id: "retrying", status: "retrying" },
        succeeded: { id: "succeeded", status: "succeeded" },
        cancelled: { id: "cancelled", status: "cancelled" },
    } as typeof projection.runs;
    let counter = 0;

    const recovery = staleRunRecoveryTransaction(projection, "2026-08-28T00:00:00.000Z", () => `id-${++counter}`);

    assert.deepEqual(recovery, {
        schemaVersion: 1,
        sequence: 8,
        transactionId: "id-1",
        idempotencyKey: "system:restart-recovery:id-2",
        occurredAt: "2026-08-28T00:00:00.000Z",
        actor: { type: "system" },
        events: [
            { type: "run.cancelled", eventId: "id-3", runId: "queued", cancelledAt: "2026-08-28T00:00:00.000Z", reason: "agent_restart" },
            { type: "run.cancelled", eventId: "id-4", runId: "running", cancelledAt: "2026-08-28T00:00:00.000Z", reason: "agent_restart" },
            { type: "run.cancelled", eventId: "id-5", runId: "retrying", cancelledAt: "2026-08-28T00:00:00.000Z", reason: "agent_restart" },
        ],
    });
});

test("没有遗留 Run 时不创建空恢复事务", () => {
    assert.equal(staleRunRecoveryTransaction(emptyProjection(), "2026-08-28T00:00:00.000Z", () => "unused"), undefined);
});
