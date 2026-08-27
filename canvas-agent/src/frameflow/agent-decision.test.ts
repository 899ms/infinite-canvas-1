import assert from "node:assert/strict";
import test from "node:test";

import { AgentDecisionValidationError, buildAgentDecision } from "./agent-decision.js";
import type { FrameFlowPreferenceContext } from "./types.js";

const preference: FrameFlowPreferenceContext = {
    briefId: "brief-1", totalWeight: -1, sampleSize: 2, qualityRejections: 0,
    boost: [{ imageId: "image-boost", sourceEventIds: ["event-boost"], weight: 3, rating: 5, promptVersionId: "prompt-source" }],
    avoid: [{ imageId: "image-avoid", sourceEventIds: ["event-avoid"], weight: -4, comment: "avoid", promptVersionId: "prompt-source" }],
};

const input = {
    id: "decision-1", briefId: "brief-1", promptVersionId: "prompt-next", profileId: "default", summary: "preserve and avoid", preference, createdAt: "2026-08-28T00:00:00.000Z",
};

test("Agent Decision 完整映射可用偏好证据，并复制可变字段", () => {
    const decision = buildAgentDecision({
        ...input,
        plannedEvidence: [
            { imageId: "image-boost", disposition: "adopted", affectedFields: ["lighting"], reason: "preserve light" },
            { imageId: "image-avoid", disposition: "avoided", affectedFields: ["composition"], reason: "avoid center" },
        ],
    });

    assert.deepEqual(decision.evidence, [
        { imageId: "image-boost", sourceEventIds: ["event-boost"], weight: 3, rating: 5, sourcePromptVersionId: "prompt-source", disposition: "adopted", affectedFields: ["lighting"], reason: "preserve light" },
        { imageId: "image-avoid", sourceEventIds: ["event-avoid"], weight: -4, comment: "avoid", sourcePromptVersionId: "prompt-source", disposition: "avoided", affectedFields: ["composition"], reason: "avoid center" },
    ]);
    assert.notEqual(decision.evidence[0]?.sourceEventIds, preference.boost[0]?.sourceEventIds);
});

test("Agent Decision 拒绝重复、不存在或未处置的偏好证据", () => {
    const invalid = (plannedEvidence: Array<{ imageId: string; disposition: "adopted" | "avoided" | "ignored"; affectedFields: Array<"lighting">; reason: string }>) => buildAgentDecision({ ...input, plannedEvidence });

    assert.throws(() => invalid([
        { imageId: "image-boost", disposition: "adopted", affectedFields: ["lighting"], reason: "first" },
        { imageId: "image-boost", disposition: "adopted", affectedFields: ["lighting"], reason: "duplicate" },
    ]), (error) => error instanceof AgentDecisionValidationError && error.message === "Codex Planner 重复处置了同一条 Preference DNA 证据");
    assert.throws(() => invalid([
        { imageId: "image-boost", disposition: "adopted", affectedFields: ["lighting"], reason: "known" },
        { imageId: "image-missing", disposition: "ignored", affectedFields: ["lighting"], reason: "unknown" },
    ]), (error) => error instanceof AgentDecisionValidationError && error.message === "Codex Planner 引用了不存在的 Preference DNA 证据");
    assert.throws(() => invalid([
        { imageId: "image-boost", disposition: "adopted", affectedFields: ["lighting"], reason: "incomplete" },
    ]), (error) => error instanceof AgentDecisionValidationError && error.message === "Codex Planner 未完整处置 Preference DNA 证据");
});
