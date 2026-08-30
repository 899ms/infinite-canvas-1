import { buildPromptDiff } from "./prompt-diff.js";
import type { AgentDecision, CreativeBrief, FrameFlowEvent, FrameFlowPreferenceContext, PromptFields, PromptPlan } from "./types.js";

export function promptVersionEvents(input: {
    brief: Pick<CreativeBrief, "id" | "profileId" | "referenceImageIds">;
    previous?: Pick<{ id: string; revision: number; fields: PromptFields }, "id" | "revision" | "fields">;
    plan: Omit<PromptPlan, "decision">;
    decision: AgentDecision;
    preference: FrameFlowPreferenceContext;
    promptVersionId: string;
    promptEventId: string;
    decisionEventId: string;
    occurredAt: string;
}): FrameFlowEvent[] {
    return [
        {
            type: "prompt.version_created",
            eventId: input.promptEventId,
            promptVersion: {
                id: input.promptVersionId,
                ...(input.previous ? { parentId: input.previous.id } : {}),
                briefId: input.brief.id,
                revision: (input.previous?.revision || 0) + 1,
                status: "draft",
                ...input.plan,
                diff: buildPromptDiff(input.previous?.fields, input.plan.fields, input.plan.reason, input.decision, input.preference),
                decisionId: input.decision.id,
                referenceImageIds: [...input.brief.referenceImageIds],
                locks: {},
                createdAt: input.occurredAt,
            },
        },
        { type: "agent.decision_recorded", eventId: input.decisionEventId, decision: input.decision },
    ];
}
