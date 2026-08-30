import assert from "node:assert/strict";
import test from "node:test";

import { PromptApprovalError, promptApprovalEvents } from "./prompt-approval-events.js";
import type { PromptLocks, PromptVersion } from "./types.js";

const prompt = (status: PromptVersion["status"] = "draft"): PromptVersion => ({
    id: "prompt-1",
    briefId: "brief-1",
    revision: 1,
    status,
    fields: { subject: ["glass"], composition: [], color: ["blue"], lighting: [], material: [], layout: [], mood: [], rendering: [], technical: [], negative: [] },
    compiledPrompt: "blue glass",
    diff: { keep: [], add: [], change: [], remove: [], avoid: [] },
    referenceImageIds: [],
    locks: {},
    reason: "reason",
    createdAt: "2026-08-29T00:00:00.000Z",
});

test("draft Prompt 批准时生成独立锁定快照事件", () => {
    const locks: PromptLocks = { subject: ["glass"], color: ["blue"] };
    const events = promptApprovalEvents({ prompt: prompt(), locks, eventId: "event-1" });

    locks.subject?.push("mutated");
    assert.deepEqual(events, [{ type: "prompt.approved", eventId: "event-1", promptVersionId: "prompt-1", locks: { subject: ["glass"], color: ["blue"] } }]);
});

test("非 draft Prompt 与不属于字段的锁定项会被拒绝", () => {
    assert.throws(() => promptApprovalEvents({ prompt: prompt("approved"), locks: {}, eventId: "event" }), (error: unknown) => error instanceof PromptApprovalError && error.message === "只有 draft Prompt 可以批准");
    assert.throws(() => promptApprovalEvents({ prompt: prompt(), locks: { subject: ["missing"] }, eventId: "event" }), (error: unknown) => error instanceof PromptApprovalError && error.message === "锁定项不属于 Prompt 字段：subject");
});
