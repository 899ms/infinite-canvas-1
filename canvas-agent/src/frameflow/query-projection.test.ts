import assert from "node:assert/strict";
import test from "node:test";

import { canContinueExploration, currentBriefForRequirement, requirementState } from "./query-projection.js";
import { emptyProjection } from "./reducer.js";
import type { AutoRun, CreativeBrief, GenerationRun, MachineReview } from "./types.js";

const createdAt = "2026-08-28T00:00:00.000Z";

function brief(id: string, overrides: Partial<CreativeBrief> = {}): CreativeBrief {
    return {
        id,
        requirementId: "requirement-1",
        revision: 1,
        subject: "测试空间",
        purpose: "审美训练",
        aspectRatio: "1:1",
        constraints: { keep: [], avoid: [] },
        referenceImageIds: [],
        strategy: "balanced",
        profileId: "requirement-1",
        createdAt,
        ...overrides,
    };
}

function autoRun(overrides: Partial<AutoRun> = {}): AutoRun {
    return {
        id: "auto-run-1",
        name: "测试自动跑",
        briefId: "brief-2",
        count: 1,
        maxIterations: 2,
        state: "completed",
        iteration: 2,
        currentRunId: "run-1",
        createdAt,
        updatedAt: createdAt,
        ...overrides,
    };
}

test("查询投影按当前修订判断归档、替代和可继续探索", () => {
    const projection = emptyProjection();
    const first = brief("brief-1", { supersededAt: createdAt, supersededByBriefId: "brief-2" });
    const current = brief("brief-2", { revision: 2, supersedesBriefId: first.id });
    projection.briefs[first.id] = first;
    projection.briefs[current.id] = current;
    const run: GenerationRun = {
        id: "run-1",
        briefId: current.id,
        promptVersionId: "prompt-1",
        status: "succeeded",
        requestedCount: 1,
        slotIds: [],
        imageIds: ["image-1"],
        createdAt,
    };
    const review: MachineReview = {
        imageId: "image-1",
        autoRunId: "auto-run-1",
        runId: run.id,
        iteration: 2,
        rating: 4,
        comment: "保留构图，继续探索光线。",
        decision: "vary",
        strengths: [],
        issues: [],
        createdAt,
    };
    projection.runs[run.id] = run;
    projection.machineReviewsByImage[review.imageId] = review;

    assert.equal(currentBriefForRequirement(projection, first).id, current.id);
    assert.deepEqual(requirementState(projection, first.id), { requirementArchived: false, briefSuperseded: true });
    assert.deepEqual(requirementState(projection, current.id), { requirementArchived: false, briefSuperseded: false });
    assert.equal(canContinueExploration(projection, autoRun()), true);

    current.archivedAt = createdAt;
    assert.deepEqual(requirementState(projection, first.id), { requirementArchived: true, briefSuperseded: true });
    assert.equal(canContinueExploration(projection, autoRun()), false);
});
