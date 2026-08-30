import assert from "node:assert/strict";
import test from "node:test";

import { MachineReviewEventError, machineReviewEvents } from "./machine-review-events.js";
import type { AutoRun, MachineReview } from "./types.js";

const review = (imageId: string): Omit<MachineReview, "autoRunId" | "runId" | "iteration" | "createdAt"> => ({ imageId, rating: 4, comment: `${imageId} 值得保留`, decision: "keep", strengths: ["构图"], issues: [] });
const autoRun = (overrides: Partial<Pick<AutoRun, "currentRunId" | "iteration" | "maxIterations" | "state">> = {}): Pick<AutoRun, "id" | "currentRunId" | "iteration" | "maxIterations" | "state"> => ({ id: "auto-run", currentRunId: "run", iteration: 2, maxIterations: 2, state: "reviewing", ...overrides });

test("machineReviewEvents 为每张待审图片记录审图，并在最终轮完成自动跑", () => {
    const events = machineReviewEvents({
        reviews: [review("image-a"), review("image-b")],
        pendingImageIds: ["image-a", "image-b"],
        existingReviewImageIds: new Set(),
        autoRun: autoRun(),
        runId: "run",
        occurredAt: "2026-08-29T00:00:00.000Z",
        createId: (() => { let index = 0; return () => `event-${++index}`; })(),
    });

    assert.deepEqual(events.map((event) => event.type), ["machine_review.recorded", "machine_review.recorded", "auto_run.completed"]);
    assert.deepEqual(events[0], {
        type: "machine_review.recorded",
        eventId: "event-1",
        review: { ...review("image-a"), autoRunId: "auto-run", runId: "run", iteration: 2, createdAt: "2026-08-29T00:00:00.000Z" },
    });
});

test("machineReviewEvents 拒绝缺项、重复项和非本轮图片", () => {
    const input = {
        pendingImageIds: ["image-a", "image-b"],
        existingReviewImageIds: new Set<string>(),
        autoRun: autoRun({ iteration: 1, maxIterations: 2 }),
        runId: "run",
        occurredAt: "2026-08-29T00:00:00.000Z",
        createId: () => "event",
    };

    assert.throws(() => machineReviewEvents({ ...input, reviews: [review("image-a")] }), MachineReviewEventError);
    assert.throws(() => machineReviewEvents({ ...input, reviews: [review("image-a"), review("image-a")] }), MachineReviewEventError);
    assert.throws(() => machineReviewEvents({ ...input, reviews: [review("image-a"), review("image-c")] }), MachineReviewEventError);
});

test("machineReviewEvents 不重复写入已有审图，也不会提前完成自动跑", () => {
    const events = machineReviewEvents({
        reviews: [review("image-a")],
        pendingImageIds: ["image-a"],
        existingReviewImageIds: new Set(["image-a"]),
        autoRun: autoRun({ iteration: 1, maxIterations: 2 }),
        runId: "run",
        occurredAt: "2026-08-29T00:00:00.000Z",
        createId: () => "event",
    });

    assert.deepEqual(events, []);
});
