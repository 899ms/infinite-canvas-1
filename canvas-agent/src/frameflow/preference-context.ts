import { preferenceDna, type FrameFlowProjection } from "./reducer.js";
import type { FrameFlowPreferenceContext, PreferenceDnaResult } from "./types.js";

export function plannerPreferenceContext(projection: FrameFlowProjection, briefId: string): FrameFlowPreferenceContext {
    const dna = preferenceDna(projection, briefId);
    const evidence = (signal: PreferenceDnaResult["boost"][number]) => {
        const image = projection.images[signal.imageId];
        const prompt = image ? projection.prompts[image.promptVersionId] : undefined;
        const feedback = projection.feedbackByImage[signal.imageId];
        return {
            imageId: signal.imageId,
            sourceEventIds: unique([...signal.sourceEventIds, ...(feedback?.commentEventId ? [feedback.commentEventId] : [])]),
            weight: signal.weight,
            ...(feedback?.rating ? { rating: feedback.rating } : {}),
            ...(feedback?.comment !== undefined ? { comment: feedback.comment } : {}),
            ...(prompt ? { promptVersionId: prompt.id, fields: structuredClone(prompt.fields) } : {}),
        };
    };
    return {
        briefId,
        totalWeight: dna.totalWeight,
        sampleSize: dna.sampleSize,
        qualityRejections: dna.qualityRejections,
        boost: dna.boost.map(evidence),
        avoid: dna.avoid.map(evidence),
    };
}

function unique(values: string[]) {
    return [...new Set(values)];
}
