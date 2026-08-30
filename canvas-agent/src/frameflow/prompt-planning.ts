import { AgentDecisionValidationError, buildAgentDecision } from "./agent-decision.js";
import { promptVersionEvents } from "./prompt-version-events.js";
import { promptPlanSchema } from "./schemas.js";
import type { CreativeBrief, FrameFlowEvent, FrameFlowPreferenceContext, FrameFlowPromptPlanner, MachineReview, PromptVersion } from "./types.js";

export class PromptPlanningError extends Error {
    constructor(message: string, readonly statusCode: 500) {
        super(message);
    }
}

export async function planPromptEvents(input: {
    planner: FrameFlowPromptPlanner;
    brief: CreativeBrief;
    strategy: CreativeBrief["strategy"];
    preference: FrameFlowPreferenceContext;
    machineReviews: MachineReview[];
    previous?: PromptVersion;
    occurredAt: string;
    promptEventId: string;
    createId: () => string;
}): Promise<FrameFlowEvent[]> {
    const parsedPlan = promptPlanSchema.parse(await input.planner.plan({
        brief: structuredClone(input.brief),
        strategy: input.strategy,
        preference: structuredClone(input.preference),
        machineReviews: structuredClone(input.machineReviews),
    }));
    const { decision: decisionPlan, ...plan } = parsedPlan;
    if (input.preference.sampleSize > 0 && !decisionPlan) throw new PromptPlanningError("Codex Planner 未说明如何处置 Preference DNA 证据", 500);
    const promptVersionId = input.createId();
    let decision;
    try {
        decision = buildAgentDecision({
            id: input.createId(),
            briefId: input.brief.id,
            promptVersionId,
            profileId: input.brief.profileId,
            summary: decisionPlan?.summary || plan.reason,
            plannedEvidence: decisionPlan?.evidence || [],
            preference: input.preference,
            createdAt: input.occurredAt,
        });
    } catch (error) {
        if (error instanceof AgentDecisionValidationError) throw new PromptPlanningError(error.message, 500);
        throw error;
    }
    return promptVersionEvents({
        brief: input.brief,
        ...(input.previous ? { previous: input.previous } : {}),
        plan,
        decision,
        preference: input.preference,
        promptVersionId,
        promptEventId: input.promptEventId,
        decisionEventId: input.createId(),
        occurredAt: input.occurredAt,
    });
}
