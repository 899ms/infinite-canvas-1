import type { FrameFlowProjection } from "./reducer.js";
import type { PromptLineageResult, PromptVersion } from "./types.js";

export function promptLineage(projection: FrameFlowProjection, promptVersionId: string, missingError: () => Error): PromptLineageResult {
    const versions = [];
    let current: PromptVersion | undefined = projection.prompts[promptVersionId];
    if (!current) throw missingError();
    while (current) {
        versions.unshift(structuredClone(current));
        current = current.parentId ? projection.prompts[current.parentId] : undefined;
    }
    const decisions = versions.flatMap((version) => version.decisionId && projection.decisions[version.decisionId] ? [structuredClone(projection.decisions[version.decisionId]!)] : []);
    return { type: "prompt.lineage", promptVersionId, versions, decisions };
}
