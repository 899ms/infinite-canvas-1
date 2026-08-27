import type { FrameFlowCommandResult, FrameFlowTransaction } from "./types.js";

export function transactionResult(transaction: FrameFlowTransaction): FrameFlowCommandResult {
    const event = transaction.events[0];
    const queued = transaction.events.find((item) => item.type === "run.queued");
    return {
        transactionId: transaction.transactionId,
        sequence: transaction.sequence,
        eventIds: transaction.events.map((item) => item.eventId),
        ...(event?.type === "brief.created" || event?.type === "brief.revised" ? { resource: { type: "brief" as const, id: event.brief.id } } : {}),
        ...(event?.type === "brief.archived" ? { resource: { type: "brief" as const, id: event.briefId } } : {}),
        ...(event?.type === "brief.restored" ? { resource: { type: "brief" as const, id: event.briefId } } : {}),
        ...(event?.type === "auto_run.created" || event?.type === "auto_run.updated" ? { resource: { type: "auto_run" as const, id: event.autoRun.id } } : {}),
        ...(event?.type === "auto_run.paused" || event?.type === "auto_run.failed" || event?.type === "auto_run.awaiting_review" || event?.type === "auto_run.review_started" || event?.type === "auto_run.completed" || event?.type === "auto_run.extended" ? { resource: { type: "auto_run" as const, id: event.autoRunId } } : {}),
        ...(event?.type === "prompt.version_created" ? { resource: { type: "prompt_version" as const, id: event.promptVersion.id } } : {}),
        ...(event?.type === "prompt.translation_created" ? { resource: { type: "prompt_version" as const, id: event.promptVersionId } } : {}),
        ...(queued?.type === "run.queued" ? { resource: { type: "run" as const, id: queued.run.id } } : {}),
        ...(event?.type === "run.retry_started" ? { resource: { type: "run" as const, id: event.runId } } : {}),
        ...(event?.type === "run.cancelled" ? { resource: { type: "run" as const, id: event.runId } } : {}),
    };
}
