import assert from "node:assert/strict";
import test from "node:test";

import { PromptTranslationError, promptTranslationEvents } from "./prompt-translation-events.js";
import type { PromptTranslation, PromptVersion } from "./types.js";

const fields = () => ({ subject: ["glass"], composition: [], color: [], lighting: [], material: [], layout: [], mood: [], rendering: [], technical: [], negative: [] });
const prompt = (translations?: PromptVersion["translations"]): PromptVersion => ({ id: "prompt-1", briefId: "brief-1", revision: 1, status: "approved", fields: fields(), compiledPrompt: "glass", ...(translations ? { translations } : {}), diff: { keep: [], add: [], change: [], remove: [], avoid: [] }, referenceImageIds: [], locks: {}, reason: "reason", createdAt: "2026-08-29T00:00:00.000Z" });

test("已有中文翻译直接返回独立快照，不调用翻译 Provider", async () => {
    let called = false;
    const cached: PromptTranslation = { fields: fields(), compiledPrompt: "玻璃" };
    const events = await promptTranslationEvents({ prompt: prompt({ "zh-CN": cached }), language: "zh-CN", eventId: "event-1", translate: async () => { called = true; return cached; } });
    cached.fields.subject.push("mutated");

    assert.equal(called, false);
    assert.deepEqual(events, [{ type: "prompt.translation_created", eventId: "event-1", promptVersionId: "prompt-1", language: "zh-CN", translation: { fields: fields(), compiledPrompt: "玻璃" } }]);
});

test("缺少缓存时使用 Provider 的有效翻译创建事件", async () => {
    const source = prompt();
    const events = await promptTranslationEvents({ prompt: source, language: "zh-CN", eventId: "event-2", translate: async (input) => {
        assert.notEqual(input.prompt, source);
        return { fields: fields(), compiledPrompt: "玻璃" };
    } });

    assert.deepEqual(events, [{ type: "prompt.translation_created", eventId: "event-2", promptVersionId: "prompt-1", language: "zh-CN", translation: { fields: fields(), compiledPrompt: "玻璃" } }]);
});

test("未配置翻译 Provider 时保留原有领域错误", async () => {
    await assert.rejects(() => promptTranslationEvents({ prompt: prompt(), language: "zh-CN", eventId: "event", translate: undefined }), (error: unknown) => error instanceof PromptTranslationError && error.message === "FrameFlow Codex 中文翻译尚未配置");
});
