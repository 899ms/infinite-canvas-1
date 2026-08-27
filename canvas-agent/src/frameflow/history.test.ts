import assert from "node:assert/strict";
import test from "node:test";

import { emptyProjection } from "./reducer.js";
import { eventHistory } from "./history.js";
import type { FrameFlowTransaction } from "./types.js";

const occurredAt = "2026-08-28T00:00:00.000Z";
const transactions: FrameFlowTransaction[] = [
    {
        schemaVersion: 1, sequence: 1, transactionId: "transaction-1", idempotencyKey: "key-1", occurredAt, actor: { type: "user" },
        events: [{ type: "run.queued", eventId: "event-queued", run: { id: "run-1", briefId: "brief-1", promptVersionId: "prompt-1" } } as FrameFlowTransaction["events"][number]],
    },
    {
        schemaVersion: 1, sequence: 2, transactionId: "transaction-2", idempotencyKey: "key-2", occurredAt: "2026-08-28T00:01:00.000Z", actor: { type: "system" },
        events: [{ type: "run.cancelled", eventId: "event-cancelled", runId: "run-1", cancelledAt: "2026-08-28T00:01:00.000Z", reason: "agent_restart" }],
    },
];

test("事件历史按关联资源筛选并保留事务顺序和分页", () => {
    const first = eventHistory(transactions, emptyProjection(), { type: "event.history", subjectId: "run-1", limit: 1 });
    assert.equal(first.events.length, 1);
    assert.equal(first.events[0]?.type, "run.queued");
    assert.equal(first.events[0]?.sequence, 1);
    assert.equal(first.nextCursor, "1");

    const second = eventHistory(transactions, emptyProjection(), { type: "event.history", subjectId: "run-1", cursor: first.nextCursor, limit: 1 });
    assert.equal(second.events.length, 1);
    assert.equal(second.events[0]?.type, "run.cancelled");
    assert.equal(second.events[0]?.sequence, 2);
    assert.equal(second.nextCursor, undefined);
});

test("事件历史不会把不关联资源的事件泄漏到结果中", () => {
    const history = eventHistory(transactions, emptyProjection(), { type: "event.history", subjectId: "run-other", limit: 20 });
    assert.deepEqual(history.events, []);
});
