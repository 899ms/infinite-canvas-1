import assert from "node:assert/strict";
import test from "node:test";

import { autoRunFailureTransaction } from "./auto-run-failure-transaction.js";

test("autoRunFailureTransaction 构造可回放系统失败事务并截断错误文本", () => {
    const createId = (() => { let index = 0; return () => `id-${++index}`; })();
    const transaction = autoRunFailureTransaction({ autoRunId: "auto-run", message: "错误".repeat(400), sequence: 7, occurredAt: "2026-08-29T00:00:00.000Z", createId });

    assert.equal(transaction.sequence, 8);
    assert.equal(transaction.transactionId, "id-1");
    assert.equal(transaction.idempotencyKey, "system:auto-run-failure:auto-run:id-2");
    assert.deepEqual(transaction.actor, { type: "system" });
    assert.deepEqual(transaction.events, [{ type: "auto_run.failed", eventId: "id-3", autoRunId: "auto-run", error: "错误".repeat(250), failedAt: "2026-08-29T00:00:00.000Z" }]);
});

test("autoRunFailureTransaction 保留短错误原文", () => {
    const transaction = autoRunFailureTransaction({ autoRunId: "auto-run", message: "审图失败", sequence: 0, occurredAt: "2026-08-29T00:00:00.000Z", createId: () => "id" });

    assert.equal(transaction.events[0].type, "auto_run.failed");
    assert.equal(transaction.events[0].error, "审图失败");
});
