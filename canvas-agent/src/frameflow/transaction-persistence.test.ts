import assert from "node:assert/strict";
import test from "node:test";

import { persistFrameFlowTransaction } from "./transaction-persistence.js";
import type { FrameFlowTransaction } from "./types.js";

const transaction: FrameFlowTransaction = {
    schemaVersion: 1,
    sequence: 1,
    transactionId: "transaction-1",
    idempotencyKey: "test:transaction-1",
    occurredAt: "2026-08-29T00:00:00.000Z",
    actor: { type: "system" },
    events: [],
};

test("持久化先追加事实，再应用并写出最新投影", async () => {
    const calls: string[] = [];
    let projection = "before";

    await persistFrameFlowTransaction({
        transaction,
        append: async (item) => { calls.push(`append:${item.transactionId}`); },
        remember: (item) => { calls.push(`remember:${item.sequence}`); projection = "after"; },
        currentProjection: () => projection,
        writeProjection: async (value) => { calls.push(`write:${value}`); },
    });

    assert.deepEqual(calls, ["append:transaction-1", "remember:1", "write:after"]);
});

test("事实日志追加失败时运行清理，但绝不应用或写出投影", async () => {
    const calls: string[] = [];
    const failure = new Error("journal unavailable");

    await assert.rejects(() => persistFrameFlowTransaction({
        transaction,
        append: async () => { calls.push("append"); throw failure; },
        remember: () => { calls.push("remember"); },
        currentProjection: () => "unchanged",
        writeProjection: async () => { calls.push("write"); },
        onAppendFailure: async () => { calls.push("cleanup"); },
    }), (error: unknown) => error === failure);

    assert.deepEqual(calls, ["append", "cleanup"]);
});
