import assert from "node:assert/strict";
import test from "node:test";

import { plannerPreferenceContext } from "./preference-context.js";
import { emptyProjection } from "./reducer.js";
import type { PromptFields } from "./types.js";

const fields: PromptFields = {
    subject: ["chair"], composition: [], color: [], lighting: [], material: [], layout: [], mood: [], rendering: [], technical: [], negative: [],
};

test("偏好上下文只聚合同一 Requirement 的反馈，并补齐评论与 Prompt 血缘", () => {
    const projection = emptyProjection();
    projection.briefs = {
        "brief-current": { id: "brief-current", requirementId: "requirement-1" },
        "brief-revision": { id: "brief-revision", requirementId: "requirement-1" },
        "brief-other": { id: "brief-other", requirementId: "requirement-other" },
    } as typeof projection.briefs;
    projection.runs = {
        "run-boost": { id: "run-boost", briefId: "brief-revision" },
        "run-avoid": { id: "run-avoid", briefId: "brief-current" },
        "run-other": { id: "run-other", briefId: "brief-other" },
    } as typeof projection.runs;
    projection.prompts = {
        "prompt-boost": { id: "prompt-boost", fields },
        "prompt-avoid": { id: "prompt-avoid", fields },
        "prompt-other": { id: "prompt-other", fields },
    } as typeof projection.prompts;
    projection.images = {
        "image-boost": { id: "image-boost", runId: "run-boost", promptVersionId: "prompt-boost" },
        "image-avoid": { id: "image-avoid", runId: "run-avoid", promptVersionId: "prompt-avoid" },
        "image-other": { id: "image-other", runId: "run-other", promptVersionId: "prompt-other" },
    } as typeof projection.images;
    projection.feedbackByImage = {
        "image-boost": { rating: 5, ratingEventId: "event-rating", comment: "strong", commentEventId: "event-comment" },
        "image-avoid": { hidden: { eventId: "event-hidden", reason: "aesthetic_dislike" }, comment: "avoid", commentEventId: "event-avoid-comment" },
        "image-other": { rating: 5, ratingEventId: "event-other" },
    };

    const preference = plannerPreferenceContext(projection, "brief-current");

    assert.equal(preference.totalWeight, -1);
    assert.equal(preference.sampleSize, 2);
    assert.deepEqual(preference.boost[0], {
        imageId: "image-boost", sourceEventIds: ["event-rating", "event-comment"], weight: 3,
        rating: 5, comment: "strong", promptVersionId: "prompt-boost", fields,
    });
    assert.deepEqual(preference.avoid[0], {
        imageId: "image-avoid", sourceEventIds: ["event-hidden", "event-avoid-comment"], weight: -4,
        comment: "avoid", promptVersionId: "prompt-avoid", fields,
    });
    assert.equal(preference.boost.some((item) => item.imageId === "image-other"), false);
    assert.notEqual(preference.boost[0]?.fields, projection.prompts["prompt-boost"]?.fields);
});
