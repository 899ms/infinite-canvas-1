import assert from "node:assert/strict";
import test from "node:test";

import { transactionResult } from "./transaction-result.js";
import type { FrameFlowTransaction } from "./types.js";

function transaction(events: FrameFlowTransaction["events"]): FrameFlowTransaction {
    return {
        schemaVersion: 1,
        sequence: 8,
        transactionId: "transaction-8",
        idempotencyKey: "key-8",
        occurredAt: "2026-08-28T00:00:00.000Z",
        actor: { type: "user", id: "user-1" },
        events,
    };
}

test("事务结果保留首事件的 Brief 资源与全部事件 ID", () => {
    const result = transactionResult(transaction([
        { type: "brief.archived", eventId: "event-brief", briefId: "brief-1", archivedAt: "2026-08-28T00:00:00.000Z" },
        { type: "image.hidden", eventId: "event-image", imageId: "image-1" },
    ]));

    assert.deepEqual(result, {
        transactionId: "transaction-8",
        sequence: 8,
        eventIds: ["event-brief", "event-image"],
        resource: { type: "brief", id: "brief-1" },
    });
});

test("排队 Run 可从事务中识别，并覆盖同批次的首事件资源", () => {
    const result = transactionResult(transaction([
        { type: "prompt.approved", eventId: "event-approved", promptVersionId: "prompt-1", approvedAt: "2026-08-28T00:00:00.000Z" },
        { type: "run.queued", eventId: "event-run", run: { id: "run-1", briefId: "brief-1", promptVersionId: "prompt-1" } },
    ]));

    assert.deepEqual(result.resource, { type: "run", id: "run-1" });
});

test("重试与取消 Run 仍以首事件的 Run ID 返回资源", () => {
    const retried = transactionResult(transaction([
        { type: "run.retry_started", eventId: "event-retry", runId: "run-1", slotIds: ["slot-1"], retryCount: 2 },
    ]));
    const cancelled = transactionResult(transaction([
        { type: "run.cancelled", eventId: "event-cancel", runId: "run-2", cancelledAt: "2026-08-28T00:00:00.000Z", reason: "manual" },
    ]));

    assert.deepEqual(retried.resource, { type: "run", id: "run-1" });
    assert.deepEqual(cancelled.resource, { type: "run", id: "run-2" });
});
