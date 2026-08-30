import { DEFAULT_CREATIVE_BRIEF_PURPOSE } from "./types.js";
import type { AutoRun, CreativeBrief, CreativeBriefInput, FrameFlowEvent } from "./types.js";

export function createBriefEvent(input: { input: CreativeBriefInput; briefId: string; eventId: string; occurredAt: string }): FrameFlowEvent[] {
    const { briefId, eventId, occurredAt } = input;
    return [{ type: "brief.created", eventId, brief: { id: briefId, requirementId: briefId, revision: 1, ...input.input, purpose: input.input.purpose?.trim() || DEFAULT_CREATIVE_BRIEF_PURPOSE, profileId: briefId, createdAt: occurredAt } }];
}

export function reviseBriefEvents(input: {
    source: CreativeBrief;
    input: CreativeBriefInput;
    sourceAutoRun?: AutoRun;
    briefId: string;
    autoRunId?: string;
    eventId: string;
    autoRunEventId?: string;
    occurredAt: string;
}): FrameFlowEvent[] {
    const { source, sourceAutoRun, briefId, eventId, occurredAt } = input;
    const revision = (source.revision ?? 1) + 1;
    const events: FrameFlowEvent[] = [{
        type: "brief.revised",
        eventId,
        sourceBriefId: source.id,
        supersededAt: occurredAt,
        brief: { id: briefId, requirementId: source.requirementId ?? source.id, revision, supersedesBriefId: source.id, ...input.input, purpose: input.input.purpose?.trim() || DEFAULT_CREATIVE_BRIEF_PURPOSE, profileId: briefId, createdAt: occurredAt },
    }];
    if (sourceAutoRun && input.autoRunId && input.autoRunEventId) {
        events.push({ type: "auto_run.created", eventId: input.autoRunEventId, autoRun: { id: input.autoRunId, name: `${sourceAutoRun.name} · 修订 ${revision}`.slice(0, 500), briefId, count: sourceAutoRun.count, maxIterations: sourceAutoRun.maxIterations, state: "paused", iteration: 0, createdAt: occurredAt, updatedAt: occurredAt } });
    }
    return events;
}

export function archiveBriefEvent(input: { brief: CreativeBrief; eventId: string; occurredAt: string }): FrameFlowEvent[] {
    return [{ type: "brief.archived", eventId: input.eventId, briefId: input.brief.id, requirementId: input.brief.requirementId ?? input.brief.id, archivedAt: input.occurredAt }];
}

export function restoreBriefEvent(input: { brief: CreativeBrief; eventId: string; occurredAt: string }): FrameFlowEvent[] {
    return [{ type: "brief.restored", eventId: input.eventId, briefId: input.brief.id, requirementId: input.brief.requirementId ?? input.brief.id, restoredAt: input.occurredAt }];
}
