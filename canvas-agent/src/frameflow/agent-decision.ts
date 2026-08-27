import type { AgentDecision, FrameFlowPreferenceContext, PromptFieldKey } from "./types.js";

export type AgentDecisionInput = {
    id: string;
    briefId: string;
    promptVersionId: string;
    profileId: string;
    summary: string;
    plannedEvidence: Array<{ imageId: string; disposition: "adopted" | "avoided" | "ignored"; affectedFields: PromptFieldKey[]; reason: string }>;
    preference: FrameFlowPreferenceContext;
    createdAt: string;
};

export class AgentDecisionValidationError extends Error {
    override name = "AgentDecisionValidationError";
}

export function buildAgentDecision(input: AgentDecisionInput): AgentDecision {
    const available = [...input.preference.boost, ...input.preference.avoid];
    const availableByImage = new Map(available.map((evidence) => [evidence.imageId, evidence]));
    const plannedIds = input.plannedEvidence.map((evidence) => evidence.imageId);
    if (new Set(plannedIds).size !== plannedIds.length) throw new AgentDecisionValidationError("Codex Planner 重复处置了同一条 Preference DNA 证据");
    if (plannedIds.some((imageId) => !availableByImage.has(imageId))) throw new AgentDecisionValidationError("Codex Planner 引用了不存在的 Preference DNA 证据");
    if (available.some((evidence) => !plannedIds.includes(evidence.imageId))) throw new AgentDecisionValidationError("Codex Planner 未完整处置 Preference DNA 证据");
    return {
        id: input.id,
        briefId: input.briefId,
        promptVersionId: input.promptVersionId,
        profileId: input.profileId,
        summary: input.summary,
        evidence: input.plannedEvidence.map((planned) => {
            const source = availableByImage.get(planned.imageId)!;
            return {
                imageId: source.imageId,
                sourceEventIds: [...source.sourceEventIds],
                weight: source.weight,
                ...(source.rating ? { rating: source.rating } : {}),
                ...(source.comment !== undefined ? { comment: source.comment } : {}),
                ...(source.promptVersionId ? { sourcePromptVersionId: source.promptVersionId } : {}),
                disposition: planned.disposition,
                affectedFields: [...planned.affectedFields],
                reason: planned.reason,
            };
        }),
        createdAt: input.createdAt,
    };
}
