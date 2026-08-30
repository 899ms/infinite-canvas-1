import type { AutoRun, FrameFlowEvent, MachineReview } from "./types.js";

export class MachineReviewEventError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MachineReviewEventError";
    }
}

export function machineReviewEvents(input: {
    reviews: Array<Omit<MachineReview, "autoRunId" | "runId" | "iteration" | "createdAt">>;
    pendingImageIds: string[];
    existingReviewImageIds: ReadonlySet<string>;
    autoRun: Pick<AutoRun, "id" | "currentRunId" | "iteration" | "maxIterations" | "state">;
    runId: string;
    occurredAt: string;
    createId: () => string;
}): FrameFlowEvent[] {
    const actualIds = input.reviews.map((review) => review.imageId);
    if (new Set(actualIds).size !== actualIds.length || input.pendingImageIds.some((imageId) => !actualIds.includes(imageId)) || actualIds.some((imageId) => !input.pendingImageIds.includes(imageId))) {
        throw new MachineReviewEventError("Codex 机器审图没有逐张覆盖本轮图片");
    }
    const events: FrameFlowEvent[] = input.reviews
        .filter((review) => !input.existingReviewImageIds.has(review.imageId))
        .map((review) => ({
            type: "machine_review.recorded",
            eventId: input.createId(),
            review: { ...review, autoRunId: input.autoRun.id, runId: input.runId, iteration: input.autoRun.iteration, createdAt: input.occurredAt },
        }));
    if (events.length && input.autoRun.currentRunId === input.runId && input.autoRun.state === "reviewing" && input.autoRun.iteration >= input.autoRun.maxIterations) {
        events.push({ type: "auto_run.completed", eventId: input.createId(), autoRunId: input.autoRun.id, runId: input.runId, completedAt: input.occurredAt });
    }
    return events;
}
