import type { AgentDecision, AutoRun, AutoRunTrajectorySummary, CreativeBrief, DailyCollectionSchedule, FrameFlowEvent, FrameFlowImageAsset, FrameFlowReferenceAsset, FrameFlowTransaction, GenerationRun, GenerationSlot, MachineReview, PreferenceDnaResult, PromptVersion, SoftDeleteReason } from "./types.js";

type ImageFeedback = {
    rating?: 1 | 2 | 3 | 4 | 5;
    ratingEventId?: string;
    comment?: string;
    commentEventId?: string;
    hidden?: { eventId: string; reason: SoftDeleteReason };
};

export type FrameFlowProjection = {
    sequence: number;
    briefs: Record<string, CreativeBrief>;
    autoRuns: Record<string, AutoRun>;
    schedules: Record<string, DailyCollectionSchedule>; // Legacy replay projection; Auto Run uses autoRuns.
    prompts: Record<string, PromptVersion>;
    decisions: Record<string, AgentDecision>;
    runs: Record<string, GenerationRun>;
    slots: Record<string, GenerationSlot>;
    images: Record<string, FrameFlowImageAsset>;
    references: Record<string, FrameFlowReferenceAsset>;
    feedbackByImage: Record<string, ImageFeedback>;
    machineReviewsByImage: Record<string, MachineReview>;
    trajectorySummariesByAutoRun: Record<string, AutoRunTrajectorySummary>;
};

export function emptyProjection(): FrameFlowProjection {
    return { sequence: 0, briefs: {}, autoRuns: {}, schedules: {}, prompts: {}, decisions: {}, runs: {}, slots: {}, images: {}, references: {}, feedbackByImage: {}, machineReviewsByImage: {}, trajectorySummariesByAutoRun: {} };
}

export function applyTransaction(current: FrameFlowProjection, transaction: FrameFlowTransaction): FrameFlowProjection {
    const next = structuredClone(current);
    for (const event of transaction.events) applyEvent(next, event);
    next.sequence = transaction.sequence;
    return next;
}

export function preferenceDna(projection: FrameFlowProjection, briefId: string): PreferenceDnaResult {
    const boost = [];
    const avoid = [];
    let qualityRejections = 0;

    const targetBrief = projection.briefs[briefId];
    const requirementId = targetBrief?.requirementId ?? targetBrief?.id ?? briefId;
    for (const [imageId, feedback] of Object.entries(projection.feedbackByImage)) {
        const image = projection.images[imageId];
        const sourceBriefId = image
            ? projection.runs[image.runId]?.briefId ?? projection.prompts[image.promptVersionId]?.briefId
            : undefined;
        const sourceBrief = sourceBriefId ? projection.briefs[sourceBriefId] : undefined;
        if ((sourceBrief?.requirementId ?? sourceBriefId) !== requirementId) continue;
        if (feedback.hidden && feedback.hidden.reason !== "aesthetic_dislike") qualityRejections += 1;
        const sourceEventIds: string[] = [];
        let weight = 0;
        if (feedback.rating && feedback.ratingEventId) {
            weight = ratingWeight(feedback.rating);
            sourceEventIds.push(feedback.ratingEventId);
        }
        if (feedback.hidden?.reason === "aesthetic_dislike") {
            weight = -4;
            sourceEventIds.splice(0, sourceEventIds.length, feedback.hidden.eventId);
        }
        if (weight > 0) boost.push({ imageId, weight, sourceEventIds });
        if (weight < 0) avoid.push({ imageId, weight, sourceEventIds });
    }

    return {
        type: "preference.dna",
        briefId,
        totalWeight: [...boost, ...avoid].reduce((sum, item) => sum + item.weight, 0),
        sampleSize: boost.length + avoid.length,
        boost,
        avoid,
        qualityRejections,
    };
}

function applyEvent(projection: FrameFlowProjection, event: FrameFlowEvent) {
    if (event.type === "brief.created") {
        projection.briefs[event.brief.id] = structuredClone(event.brief);
        return;
    }
    if (event.type === "brief.revised") {
        const source = projection.briefs[event.sourceBriefId];
        if (source) {
            source.supersededAt = event.supersededAt ?? event.archivedAt;
            source.supersededByBriefId = event.brief.id;
            // Old development journals briefly used archivedAt for revision replacement.
            // Do not carry that implementation detail into the current projection.
            if (event.supersededAt) delete source.archivedAt;
        }
        projection.briefs[event.brief.id] = structuredClone(event.brief);
        return;
    }
    if (event.type === "brief.archived") {
        const target = projection.briefs[event.briefId];
        const requirementId = event.requirementId ?? target?.requirementId ?? event.briefId;
        for (const brief of Object.values(projection.briefs)) {
            if ((brief.requirementId ?? brief.id) === requirementId) brief.archivedAt = event.archivedAt;
        }
        return;
    }
    if (event.type === "brief.restored") {
        for (const brief of Object.values(projection.briefs)) {
            if ((brief.requirementId ?? brief.id) === event.requirementId) delete brief.archivedAt;
        }
        return;
    }
    if (event.type === "auto_run.created" || event.type === "auto_run.updated") {
        projection.autoRuns[event.autoRun.id] = structuredClone(event.autoRun);
        return;
    }
    if (event.type === "auto_run.iteration_started") {
        const autoRun = projection.autoRuns[event.autoRunId];
        if (autoRun) {
            autoRun.state = "generating";
            autoRun.iteration = event.iteration;
            autoRun.currentRunId = event.runId;
            autoRun.lastRunId = event.runId;
            autoRun.lastStartedAt = event.startedAt;
            autoRun.updatedAt = event.startedAt;
            delete autoRun.lastCompletedAt;
            delete autoRun.lastError;
        }
        return;
    }
    if (event.type === "auto_run.awaiting_review") {
        const autoRun = projection.autoRuns[event.autoRunId];
        if (autoRun && autoRun.currentRunId === event.runId) {
            autoRun.state = "reviewing";
            autoRun.lastCompletedAt = event.completedAt;
            autoRun.updatedAt = event.completedAt;
        }
        return;
    }
    if (event.type === "auto_run.review_started") {
        const autoRun = projection.autoRuns[event.autoRunId];
        if (autoRun && autoRun.currentRunId === event.runId) {
            autoRun.state = "reviewing";
            autoRun.updatedAt = event.startedAt;
        }
        return;
    }
    if (event.type === "machine_review.recorded") {
        projection.machineReviewsByImage[event.review.imageId] = structuredClone(event.review);
        return;
    }
    if (event.type === "auto_run.trajectory_summarized") {
        projection.trajectorySummariesByAutoRun[event.summary.autoRunId] = structuredClone(event.summary);
        return;
    }
    if (event.type === "auto_run.completed") {
        const autoRun = projection.autoRuns[event.autoRunId];
        if (autoRun && autoRun.currentRunId === event.runId) {
            autoRun.state = "completed";
            autoRun.lastCompletedAt = event.completedAt;
            autoRun.updatedAt = event.completedAt;
        }
        return;
    }
    if (event.type === "auto_run.extended") {
        const autoRun = projection.autoRuns[event.autoRunId];
        if (autoRun) {
            autoRun.maxIterations = event.maxIterations;
            autoRun.state = "generating";
            autoRun.lastStartedAt = event.extendedAt;
            autoRun.updatedAt = event.extendedAt;
            delete autoRun.currentRunId;
            delete autoRun.lastError;
        }
        return;
    }
    if (event.type === "auto_run.paused") {
        const autoRun = projection.autoRuns[event.autoRunId];
        if (autoRun) {
            autoRun.state = "paused";
            autoRun.updatedAt = event.pausedAt;
        }
        return;
    }
    if (event.type === "auto_run.failed") {
        const autoRun = projection.autoRuns[event.autoRunId];
        if (autoRun) {
            autoRun.state = "failed";
            autoRun.lastError = event.error;
            autoRun.updatedAt = event.failedAt;
        }
        return;
    }
    if (event.type === "schedule.created" || event.type === "schedule.updated") {
        projection.schedules[event.schedule.id] = structuredClone(event.schedule);
        return;
    }
    if (event.type === "schedule.triggered") {
        const schedule = projection.schedules[event.scheduleId];
        if (schedule) {
            schedule.lastAttemptKey = event.triggerKey;
            schedule.lastTriggeredAt = event.triggeredAt;
            schedule.lastRunId = event.runId;
            delete schedule.lastError;
        }
        return;
    }
    if (event.type === "schedule.trigger_failed") {
        const schedule = projection.schedules[event.scheduleId];
        if (schedule) {
            schedule.lastAttemptKey = event.triggerKey;
            schedule.lastError = event.error;
        }
        return;
    }
    if (event.type === "prompt.version_created") {
        projection.prompts[event.promptVersion.id] = structuredClone(event.promptVersion);
        return;
    }
    if (event.type === "prompt.translation_created") {
        const prompt = projection.prompts[event.promptVersionId];
        if (prompt) prompt.translations = { ...prompt.translations, [event.language]: structuredClone(event.translation) };
        return;
    }
    if (event.type === "agent.decision_recorded") {
        projection.decisions[event.decision.id] = structuredClone(event.decision);
        return;
    }
    if (event.type === "prompt.approved") {
        const prompt = projection.prompts[event.promptVersionId];
        if (prompt) {
            prompt.status = "approved";
            prompt.locks = structuredClone(event.locks);
        }
        return;
    }
    if (event.type === "reference.imported") {
        projection.references[event.reference.id] = structuredClone(event.reference);
        return;
    }
    if (event.type === "run.queued") {
        projection.runs[event.run.id] = structuredClone(event.run);
        event.run.slotIds.forEach((slotId, index) => {
            projection.slots[slotId] = { id: slotId, runId: event.run.id, index, status: "queued", attempts: 0 };
        });
        const prompt = projection.prompts[event.run.promptVersionId];
        if (prompt) prompt.status = "used";
        return;
    }
    if (event.type === "run.started") {
        const run = projection.runs[event.runId];
        if (run) {
            run.status = "running";
            run.startedAt = event.startedAt;
            for (const slotId of run.slotIds) {
                const slot = projection.slots[slotId];
                if (slot?.status === "queued") slot.status = "running";
            }
        }
        return;
    }
    if (event.type === "run.retry_started") {
        const run = projection.runs[event.runId];
        if (run) run.status = "retrying";
        for (const slotId of event.slotIds) {
            const slot = projection.slots[slotId];
            if (slot) {
                slot.status = "running";
                delete slot.error;
            }
        }
        return;
    }
    if (event.type === "run.cancelled") {
        const run = projection.runs[event.runId];
        if (run) {
            run.status = "cancelled";
            run.completedAt = event.cancelledAt;
            for (const slotId of run.slotIds) {
                const slot = projection.slots[slotId];
                if (slot?.status === "queued" || slot?.status === "running") slot.status = "cancelled";
            }
        }
        const autoRun = Object.values(projection.autoRuns).find((item) => item.currentRunId === event.runId && item.state === "generating");
        if (autoRun) {
            autoRun.state = "paused";
            autoRun.updatedAt = event.cancelledAt;
        }
        return;
    }
    if (event.type === "run.slot_succeeded") {
        const run = projection.runs[event.runId];
        if (run && !run.imageIds.includes(event.imageId)) run.imageIds.push(event.imageId);
        const slot = projection.slots[event.slotId];
        if (slot) {
            slot.status = "succeeded";
            slot.imageId = event.imageId;
            slot.attempts += 1;
            delete slot.error;
        }
        return;
    }
    if (event.type === "run.slot_failed") {
        const slot = projection.slots[event.slotId];
        if (slot) {
            slot.status = "failed";
            slot.error = structuredClone(event.error);
            slot.attempts += 1;
        }
        return;
    }
    if (event.type === "image.registered") {
        projection.images[event.image.id] = structuredClone(event.image);
        return;
    }
    if (event.type === "run.completed") {
        const run = projection.runs[event.runId];
        if (run) {
            run.status = event.status;
            run.completedAt = event.completedAt;
        }
        return;
    }
    if (event.type === "image.permanently_deleted") {
        if (projection.images[event.imageId]) projection.images[event.imageId].status = "permanently_deleted";
        delete projection.feedbackByImage[event.imageId];
        return;
    }
    const feedback = projection.feedbackByImage[event.imageId] ||= {};
    if (event.type === "feedback.rating_set") {
        feedback.rating = event.rating;
        feedback.ratingEventId = event.eventId;
        if (projection.images[event.imageId]) projection.images[event.imageId].status = "reviewed";
    } else if (event.type === "feedback.comment_set") {
        feedback.comment = event.comment;
        feedback.commentEventId = event.eventId;
        if (projection.images[event.imageId]) projection.images[event.imageId].status = "reviewed";
    } else if (event.type === "image.soft_deleted") {
        feedback.hidden = { eventId: event.eventId, reason: event.reason };
        if (projection.images[event.imageId]) projection.images[event.imageId].status = "hidden";
    } else if (event.type === "image.restored") {
        delete feedback.hidden;
        if (projection.images[event.imageId]) projection.images[event.imageId].status = "restored";
    }
}

function ratingWeight(rating: 1 | 2 | 3 | 4 | 5) {
    return ({ 1: -2, 2: -1, 3: 0, 4: 2, 5: 3 } as const)[rating];
}
