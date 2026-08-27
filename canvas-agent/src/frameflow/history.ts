import type { FrameFlowProjection } from "./reducer.js";
import type { EventHistoryResult, FrameFlowEvent, FrameFlowQuery, FrameFlowTransaction } from "./types.js";

export function eventHistory(transactions: FrameFlowTransaction[], projection: FrameFlowProjection, query: Extract<FrameFlowQuery, { type: "event.history" }>): EventHistoryResult {
    const offset = query.cursor ? Number(query.cursor) : 0;
    const matching = transactions.flatMap((transaction) => transaction.events
        .filter((event) => eventSubjects(event, projection).includes(query.subjectId))
        .map((event) => ({ ...structuredClone(event), sequence: transaction.sequence, occurredAt: transaction.occurredAt })));
    const events = matching.slice(offset, offset + query.limit);
    const nextOffset = offset + events.length;
    return { type: "event.history", subjectId: query.subjectId, events, ...(nextOffset < matching.length ? { nextCursor: String(nextOffset) } : {}) };
}

export function eventSubjects(event: FrameFlowEvent, projection?: FrameFlowProjection) {
    if (event.type === "brief.created") return [event.brief.id];
    if (event.type === "brief.revised") return [event.sourceBriefId, event.brief.id, event.brief.requirementId || event.sourceBriefId];
    if (event.type === "brief.archived" || event.type === "brief.restored") {
        const requirementId = event.requirementId ?? projection?.briefs[event.briefId]?.requirementId ?? event.briefId;
        const revisionIds = projection ? Object.values(projection.briefs)
            .filter((brief) => (brief.requirementId ?? brief.id) === requirementId)
            .map((brief) => brief.id) : [];
        return unique([event.briefId, requirementId, ...revisionIds]);
    }
    if (event.type === "auto_run.created" || event.type === "auto_run.updated") return [event.autoRun.id, event.autoRun.briefId];
    if (event.type === "auto_run.iteration_started" || event.type === "auto_run.awaiting_review" || event.type === "auto_run.review_started" || event.type === "auto_run.completed") return [event.autoRunId, event.runId];
    if (event.type === "machine_review.recorded") return [event.review.autoRunId, event.review.runId, event.review.imageId];
    if (event.type === "auto_run.trajectory_summarized") return [event.summary.autoRunId];
    if (event.type === "auto_run.paused" || event.type === "auto_run.failed" || event.type === "auto_run.extended") return [event.autoRunId];
    if (event.type === "schedule.created" || event.type === "schedule.updated") return [event.schedule.id, event.schedule.briefId];
    if (event.type === "schedule.triggered") return [event.scheduleId, event.runId];
    if (event.type === "schedule.trigger_failed") return [event.scheduleId];
    if (event.type === "prompt.version_created") return [event.promptVersion.id, event.promptVersion.briefId];
    if (event.type === "prompt.translation_created") return [event.promptVersionId];
    if (event.type === "agent.decision_recorded") return [event.decision.id, event.decision.promptVersionId, event.decision.briefId, ...event.decision.evidence.map((item) => item.imageId)];
    if (event.type === "prompt.approved") return [event.promptVersionId];
    if (event.type === "reference.imported") return [event.reference.id, event.reference.source.id];
    if (event.type === "run.queued") return [event.run.id, event.run.promptVersionId, event.run.briefId];
    if (event.type === "run.started" || event.type === "run.completed" || event.type === "run.cancelled") return [event.runId];
    if (event.type === "run.retry_started") return [event.runId, ...event.slotIds];
    if (event.type === "run.slot_succeeded") return [event.runId, event.slotId, event.imageId];
    if (event.type === "run.slot_failed") return [event.runId, event.slotId];
    if (event.type === "image.registered") return [event.image.id, event.image.runId, event.image.promptVersionId];
    return [event.imageId];
}

function unique(values: string[]) {
    return [...new Set(values)];
}
