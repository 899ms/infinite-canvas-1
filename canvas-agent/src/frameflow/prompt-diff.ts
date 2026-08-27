import type { AgentDecision, FrameFlowPreferenceContext, PromptDiff, PromptFieldChange, PromptFieldKey, PromptFields } from "./types.js";

export function buildPromptDiff(previous: PromptFields | undefined, fields: PromptFields, reason: string, decision: AgentDecision, preference: FrameFlowPreferenceContext): PromptDiff {
    const diff: PromptDiff = { keep: [], add: [], change: [], remove: [], avoid: [] };
    for (const [field, values] of Object.entries(fields) as Array<[PromptFieldKey, string[]]>) {
        const before = previous?.[field] || [];
        const evidence = decision.evidence.filter((item) => item.affectedFields.includes(field));
        const change: PromptFieldChange = {
            field,
            before: [...before],
            after: [...values],
            reason,
            evidenceEventIds: unique(evidence.flatMap((item) => item.sourceEventIds)),
            evidenceImageIds: unique(evidence.map((item) => item.imageId)),
        };
        if (sameValues(before, values)) diff.keep.push(change);
        else if (!before.length) diff.add.push(change);
        else if (!values.length) diff.remove.push(change);
        else diff.change.push(change);
    }
    for (const evidence of decision.evidence.filter((item) => item.disposition === "avoided")) {
        const source = [...preference.boost, ...preference.avoid].find((item) => item.imageId === evidence.imageId);
        for (const field of evidence.affectedFields) {
            diff.avoid.push({
                field,
                before: [...(source?.fields?.[field] || [])],
                after: [...fields[field]],
                reason: evidence.reason,
                evidenceEventIds: [...evidence.sourceEventIds],
                evidenceImageIds: [evidence.imageId],
            });
        }
    }
    return diff;
}

function sameValues(left: string[], right: string[]) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function unique(values: string[]) {
    return [...new Set(values)];
}
