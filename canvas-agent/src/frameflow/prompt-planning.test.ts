import assert from "node:assert/strict";
import test from "node:test";

import { PromptPlanningError, planPromptEvents } from "./prompt-planning.js";
import type { CreativeBrief, FrameFlowPreferenceContext, FrameFlowPromptPlanner, PromptFields } from "./types.js";

const fields: PromptFields = { subject: ["陶瓷球"], composition: [], color: [], lighting: [], material: [], layout: [], mood: [], rendering: [], technical: [], negative: [] };
const brief: CreativeBrief = { id: "brief-1", requirementId: "requirement-1", revision: 1, subject: "陶瓷球", purpose: "审美训练", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: ["reference-1"], strategy: "balanced", profileId: "profile-1", createdAt: "2026-08-29T00:00:00.000Z" };
const preference: FrameFlowPreferenceContext = { briefId: "brief-1", totalWeight: 0, sampleSize: 0, qualityRejections: 0, boost: [], avoid: [] };

test("规划服务验证 Planner 结果后生成 Prompt 与 Decision 事实事件", async () => {
    const calls: unknown[] = [];
    const planner: FrameFlowPromptPlanner = { plan: async (input) => {
        calls.push(input);
        return { fields, compiledPrompt: "ceramic sphere", reason: "保留简洁主体" };
    } };

    const events = await planPromptEvents({ planner, brief, strategy: "explore", preference, machineReviews: [], occurredAt: "2026-08-29T00:00:00.000Z", promptEventId: "prompt-event-1", createId: (() => { let index = 0; return () => `id-${++index}`; })() });

    assert.deepEqual(calls, [{ brief, strategy: "explore", preference, machineReviews: [] }]);
    assert.equal(events[0]?.type, "prompt.version_created");
    assert.equal(events[1]?.type, "agent.decision_recorded");
});

test("有人工偏好时，缺少 Decision 计划会被拒绝", async () => {
    const planner: FrameFlowPromptPlanner = { plan: async () => ({ fields, compiledPrompt: "ceramic sphere", reason: "保留简洁主体" }) };
    const populatedPreference = { ...preference, sampleSize: 1 };

    await assert.rejects(
        () => planPromptEvents({ planner, brief, strategy: "balanced", preference: populatedPreference, machineReviews: [], occurredAt: "2026-08-29T00:00:00.000Z", promptEventId: "prompt-event-1", createId: () => "id-1" }),
        (error: unknown) => error instanceof PromptPlanningError && error.statusCode === 500 && error.message === "Codex Planner 未说明如何处置 Preference DNA 证据",
    );
});
