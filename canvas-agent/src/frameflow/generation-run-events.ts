import type { FrameFlowEvent } from "./types.js";

export function queueGenerationRun(input: {
    runId: string;
    briefId: string;
    promptVersionId: string;
    count: number;
    slotIds: string[];
    occurredAt: string;
    queuedEventId: string;
    startedEventId: string;
}): FrameFlowEvent[] {
    return [
        { type: "run.queued", eventId: input.queuedEventId, run: { id: input.runId, briefId: input.briefId, promptVersionId: input.promptVersionId, status: "queued", requestedCount: input.count, slotIds: input.slotIds, imageIds: [], createdAt: input.occurredAt } },
        { type: "run.started", eventId: input.startedEventId, runId: input.runId, startedAt: input.occurredAt },
    ];
}
