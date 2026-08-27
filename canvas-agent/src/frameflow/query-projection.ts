import type { AutoRun, CreativeBrief } from "./types.js";
import type { FrameFlowProjection } from "./reducer.js";

export function currentBriefForRequirement(projection: FrameFlowProjection, brief: CreativeBrief) {
    const requirementId = brief.requirementId ?? brief.id;
    const revisions = Object.values(projection.briefs)
        .filter((item) => (item.requirementId ?? item.id) === requirementId)
        .sort((left, right) => (left.revision ?? 1) - (right.revision ?? 1));
    return revisions.filter((item) => !item.supersededAt && !item.supersededByBriefId).at(-1) ?? revisions.at(-1) ?? brief;
}

export function isBriefActive(brief: CreativeBrief) {
    return !brief.archivedAt && !brief.supersededAt && !brief.supersededByBriefId;
}

export function requirementState(projection: FrameFlowProjection, briefId: string) {
    const brief = projection.briefs[briefId];
    if (!brief) return { requirementArchived: false, briefSuperseded: false };
    const current = currentBriefForRequirement(projection, brief);
    return {
        requirementArchived: Boolean(current.archivedAt),
        briefSuperseded: current.id !== brief.id || Boolean(brief.supersededAt || brief.supersededByBriefId),
    };
}

export function canContinueExploration(projection: FrameFlowProjection, autoRun: AutoRun) {
    const brief = projection.briefs[autoRun.briefId];
    if (!brief || !isBriefActive(brief)) return false;
    if (autoRun.state !== "completed" || autoRun.maxIterations >= 20 || !autoRun.currentRunId) return false;
    const run = projection.runs[autoRun.currentRunId];
    return Boolean(run?.imageIds.some((imageId) => projection.machineReviewsByImage[imageId]?.decision === "vary"));
}
