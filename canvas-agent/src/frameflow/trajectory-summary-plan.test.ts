import assert from "node:assert/strict";
import test from "node:test";

import { trajectorySummaryPlan } from "./trajectory-summary-plan.js";
import type { AutoRunTrajectoryResult, AutoRunTrajectorySummary } from "./types.js";

const trajectory = (reviewed: number[]): AutoRunTrajectoryResult => ({
    type: "auto_run.trajectory",
    autoRun: { id: "auto", state: "completed" } as AutoRunTrajectoryResult["autoRun"],
    brief: { id: "brief" } as AutoRunTrajectoryResult["brief"],
    rounds: [1, 2, 3].map((iteration) => ({ iteration, run: { id: `run-${iteration}` } as AutoRunTrajectoryResult["rounds"][number]["run"], prompt: { id: `prompt-${iteration}` } as AutoRunTrajectoryResult["rounds"][number]["prompt"], images: [{ image: { id: `image-${iteration}` } as AutoRunTrajectoryResult["rounds"][number]["images"][number]["image"], ...(reviewed.includes(iteration) ? { machineReview: { imageId: `image-${iteration}` } as AutoRunTrajectoryResult["rounds"][number]["images"][number]["machineReview"] } : {}) }] })),
});

test("只把完整审图轮次交给总结 Provider，并给出最后一轮作为范围", () => {
    const plan = trajectorySummaryPlan({ trajectory: trajectory([1, 3]), force: false });

    assert.equal(plan.type, "summarize");
    assert.equal(plan.type === "summarize" && plan.throughIteration, 3);
    assert.deepEqual(plan.type === "summarize" && plan.input.rounds.map((round) => round.iteration), [1, 3]);
});

test("未强制刷新时复用覆盖相同轮次的已有总结", () => {
    const summary = { autoRunId: "auto", throughIteration: 2 } as AutoRunTrajectorySummary;
    const plan = trajectorySummaryPlan({ trajectory: trajectory([1, 2]), existing: summary, force: false });

    assert.deepEqual(plan, { type: "cached", summary });
});
