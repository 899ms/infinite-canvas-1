import { autoRunTrajectorySummaryDraftSchema } from "./schemas.js";
import type { AutoRunTrajectorySummaryDraft, AutoRunTrajectorySummary, FrameFlowEvent } from "./types.js";

export class TrajectorySummaryEventError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TrajectorySummaryEventError";
    }
}

export function trajectorySummaryEvent(input: {
    autoRunId: string;
    throughIteration: number;
    reviewedIterations: ReadonlySet<number>;
    createdAt: string;
    draft: AutoRunTrajectorySummaryDraft;
    eventId: string;
}): { summary: AutoRunTrajectorySummary; event: Extract<FrameFlowEvent, { type: "auto_run.trajectory_summarized" }> } {
    const draft = autoRunTrajectorySummaryDraftSchema.parse(input.draft);
    const evidenceIterations = [...draft.improved, ...draft.recurring].flatMap((item) => item.evidenceIterations);
    if (!input.reviewedIterations.has(draft.bestIteration) || evidenceIterations.some((iteration) => !input.reviewedIterations.has(iteration))) {
        throw new TrajectorySummaryEventError("Codex 跨轮总结引用了不存在的轮次");
    }
    const summary: AutoRunTrajectorySummary = { ...draft, autoRunId: input.autoRunId, throughIteration: input.throughIteration, createdAt: input.createdAt };
    return { summary, event: { type: "auto_run.trajectory_summarized", eventId: input.eventId, summary } };
}
