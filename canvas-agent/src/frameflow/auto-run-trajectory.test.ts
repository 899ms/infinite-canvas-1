import assert from "node:assert/strict";
import test from "node:test";

import { autoRunTrajectory } from "./auto-run-trajectory.js";
import { emptyProjection } from "./reducer.js";
import type { AutoRun, CreativeBrief } from "./types.js";

const createdAt = "2026-08-28T00:00:00.000Z";

function brief(): CreativeBrief {
    return {
        id: "brief-1",
        requirementId: "brief-1",
        revision: 1,
        subject: "测试空间",
        purpose: "审美训练",
        aspectRatio: "1:1",
        constraints: { keep: [], avoid: [] },
        referenceImageIds: [],
        strategy: "balanced",
        profileId: "brief-1",
        createdAt,
    };
}

function autoRun(): AutoRun {
    return {
        id: "auto-run-1",
        name: "测试自动跑",
        briefId: "brief-1",
        count: 1,
        maxIterations: 2,
        state: "completed",
        iteration: 0,
        createdAt,
        updatedAt: createdAt,
    };
}

test("自动跑轨迹对空轮次保持稳定并委托缺失资源错误", () => {
    const projection = emptyProjection();
    const currentBrief = brief();
    const currentAutoRun = autoRun();
    projection.briefs[currentBrief.id] = currentBrief;
    projection.autoRuns[currentAutoRun.id] = currentAutoRun;

    const result = autoRunTrajectory(projection, [], currentAutoRun.id, (message, statusCode) => Object.assign(new Error(message), { statusCode }));

    assert.equal(result.brief.id, currentBrief.id);
    assert.deepEqual(result.rounds, []);
    assert.equal(result.autoRun.canContinueExploration, false);
    assert.throws(() => autoRunTrajectory(projection, [], "missing", (message, statusCode) => Object.assign(new Error(message), { statusCode })), /找不到自动跑/);
});
