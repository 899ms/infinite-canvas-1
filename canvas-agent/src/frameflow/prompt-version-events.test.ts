import assert from "node:assert/strict";
import test from "node:test";

import { promptVersionEvents } from "./prompt-version-events.js";
import type { AgentDecision, FrameFlowPreferenceContext, PromptFields } from "./types.js";

const fields = (subject: string): PromptFields => ({ subject: [subject], composition: [], color: [], lighting: [], material: [], layout: [], mood: [], rendering: [], technical: [], negative: [] });
const decision: AgentDecision = { id: "decision-1", briefId: "brief-1", promptVersionId: "prompt-2", profileId: "profile-1", summary: "保留构图", evidence: [], createdAt: "2026-08-29T00:00:00.000Z" };
const preference: FrameFlowPreferenceContext = { briefId: "brief-1", totalWeight: 0, sampleSize: 0, qualityRejections: 0, boost: [], avoid: [] };

test("规划结果生成可追溯的 Prompt Version 与 Agent Decision 事件", () => {
    const events = promptVersionEvents({
        brief: { id: "brief-1", profileId: "profile-1", referenceImageIds: ["reference-1"] },
        previous: { id: "prompt-1", revision: 3, fields: fields("旧主体") },
        plan: { fields: fields("新主体"), compiledPrompt: "new prompt", reason: "保留构图" },
        decision,
        preference,
        promptVersionId: "prompt-2",
        promptEventId: "prompt-event-1",
        decisionEventId: "decision-event-1",
        occurredAt: "2026-08-29T00:00:00.000Z",
    });

    assert.equal(events[0]?.type, "prompt.version_created");
    const created = events[0];
    if (!created || created.type !== "prompt.version_created") throw new Error("expected prompt.version_created");
    assert.equal(created.eventId, "prompt-event-1");
    assert.deepEqual(created.promptVersion, {
        id: "prompt-2",
        parentId: "prompt-1",
        briefId: "brief-1",
        revision: 4,
        status: "draft",
        fields: fields("新主体"),
        compiledPrompt: "new prompt",
        reason: "保留构图",
        diff: {
            keep: ["composition", "color", "lighting", "material", "layout", "mood", "rendering", "technical", "negative"].map((field) => ({ field, before: [], after: [], reason: "保留构图", evidenceEventIds: [], evidenceImageIds: [] })),
            add: [],
            change: [{ field: "subject", before: ["旧主体"], after: ["新主体"], reason: "保留构图", evidenceEventIds: [], evidenceImageIds: [] }],
            remove: [],
            avoid: [],
        },
        decisionId: "decision-1",
        referenceImageIds: ["reference-1"],
        locks: {},
        createdAt: "2026-08-29T00:00:00.000Z",
    });
    assert.deepEqual(events[1], { type: "agent.decision_recorded", eventId: "decision-event-1", decision });
});
