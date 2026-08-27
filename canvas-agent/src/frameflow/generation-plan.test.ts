import assert from "node:assert/strict";
import test from "node:test";

import { failedSlotEvents, generationCropPosition } from "./generation-plan.js";
import type { GenerationError, PromptVersion } from "./types.js";

const fields = { subject: [], composition: [], color: [], lighting: [], material: [], layout: [], mood: [], rendering: [], technical: [], negative: [] };
const prompt = (compiledPrompt: string, overrides: Partial<PromptVersion["fields"]> = {}): PromptVersion => ({
    id: "prompt-1",
    briefId: "brief-1",
    revision: 1,
    status: "approved",
    fields: { ...fields, ...overrides },
    compiledPrompt,
    diff: { keep: [], add: [], change: [], remove: [], avoid: [] },
    referenceImageIds: [],
    locks: {},
    reason: "test",
    createdAt: "2026-08-28T00:00:00.000Z",
});

test("生成裁剪位置根据 Prompt 的界面语义稳定选择", () => {
    assert.equal(generationCropPosition(prompt("cinematic portrait", { technical: ["UI concept"] })), "top");
    assert.equal(generationCropPosition(prompt("cinematic portrait", { subject: ["street portrait"] })), "attention");
});

test("失败槽位事件为每个槽位保留独立事件 ID 与错误快照", () => {
    const error: GenerationError = { code: "IMAGEGEN_FAILED", message: "provider unavailable", retryable: true };
    const events = failedSlotEvents("run-1", ["slot-1", "slot-2"], error);

    assert.deepEqual(events.map(({ type, runId, slotId, error: value }) => ({ type, runId, slotId, error: value })), [
        { type: "run.slot_failed", runId: "run-1", slotId: "slot-1", error },
        { type: "run.slot_failed", runId: "run-1", slotId: "slot-2", error },
    ]);
    assert.notEqual(events[0]?.eventId, events[1]?.eventId);
    assert.notEqual(events[0]?.error, error);
});
