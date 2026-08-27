import assert from "node:assert/strict";
import test from "node:test";

import { buildPromptDiff } from "./prompt-diff.js";
import type { AgentDecision, FrameFlowPreferenceContext, PromptFields } from "./types.js";

const previous: PromptFields = {
    subject: ["chair"], composition: ["wide"], color: ["blue"], lighting: ["soft"], material: ["wood"],
    layout: ["centered"], mood: ["calm"], rendering: ["photo"], technical: ["35mm"], negative: [],
};

const fields: PromptFields = {
    subject: ["chair"], composition: ["close"], color: [], lighting: ["soft"], material: ["wood", "linen"],
    layout: ["centered"], mood: ["calm"], rendering: ["photo"], technical: ["35mm"], negative: ["text"],
};

const decision: AgentDecision = {
    id: "decision-1", briefId: "brief-1", promptVersionId: "prompt-1", profileId: "default", summary: "adjust", createdAt: "2026-08-28T00:00:00.000Z",
    evidence: [
        { imageId: "image-adopt", sourceEventIds: ["feedback-1", "feedback-1"], weight: 3, disposition: "adopted", affectedFields: ["composition"], reason: "tighten framing" },
        { imageId: "image-avoid", sourceEventIds: ["feedback-2"], weight: -2, disposition: "avoided", affectedFields: ["color", "material"], reason: "avoid this palette" },
    ],
};

const preference: FrameFlowPreferenceContext = {
    briefId: "brief-1", totalWeight: 1, sampleSize: 2, qualityRejections: 0,
    boost: [],
    avoid: [{ imageId: "image-avoid", sourceEventIds: ["feedback-2"], weight: -2, fields: { ...previous, color: ["orange"], material: ["plastic"] } }],
};

test("Prompt Diff 归类字段变化并保留去重后的决策证据", () => {
    const diff = buildPromptDiff(previous, fields, "adjust", decision, preference);

    assert.deepEqual(diff.change, [
        { field: "composition", before: ["wide"], after: ["close"], reason: "adjust", evidenceEventIds: ["feedback-1"], evidenceImageIds: ["image-adopt"] },
        { field: "material", before: ["wood"], after: ["wood", "linen"], reason: "adjust", evidenceEventIds: ["feedback-2"], evidenceImageIds: ["image-avoid"] },
    ]);
    assert.deepEqual(diff.remove, [{
        field: "color", before: ["blue"], after: [], reason: "adjust",
        evidenceEventIds: ["feedback-2"], evidenceImageIds: ["image-avoid"],
    }]);
    assert.deepEqual(diff.add, [{
        field: "negative", before: [], after: ["text"], reason: "adjust",
        evidenceEventIds: [], evidenceImageIds: [],
    }]);
    assert.equal(diff.keep.length, 6);
});

test("Prompt Diff 为规避证据保留偏好来源字段与目标字段", () => {
    const diff = buildPromptDiff(previous, fields, "adjust", decision, preference);

    assert.deepEqual(diff.avoid, [
        { field: "color", before: ["orange"], after: [], reason: "avoid this palette", evidenceEventIds: ["feedback-2"], evidenceImageIds: ["image-avoid"] },
        { field: "material", before: ["plastic"], after: ["wood", "linen"], reason: "avoid this palette", evidenceEventIds: ["feedback-2"], evidenceImageIds: ["image-avoid"] },
    ]);
});
