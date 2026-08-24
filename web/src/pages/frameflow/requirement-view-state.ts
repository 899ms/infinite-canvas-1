export type FrameFlowRequirementScope = "active" | "archived";

export function createLatestRequestGate() {
    let sequence = 0;
    return {
        begin: () => ++sequence,
        invalidate: () => {
            sequence += 1;
        },
        isLatest: (request: number) => request === sequence,
    };
}

export function canWriteRequirement(scope: FrameFlowRequirementScope, requirementArchived: boolean) {
    return scope === "active" && !requirementArchived;
}

export function mergeRequestedAutoRun<T extends { id: string }>(listed: T[], requested?: T) {
    if (!requested || listed.some((item) => item.id === requested.id)) return listed;
    return [requested, ...listed];
}

export function requirementHasActiveWork(requirementId: string | undefined, briefs: Array<{ id: string; requirementId?: string }>, autoRuns: Array<{ briefId: string; state: string }>, runs: Array<{ briefId: string; status: string }>) {
    if (!requirementId) return false;
    const briefIds = new Set(briefs.filter((brief) => (brief.requirementId || brief.id) === requirementId).map((brief) => brief.id));
    return (
        autoRuns.some((autoRun) => briefIds.has(autoRun.briefId) && (autoRun.state === "generating" || autoRun.state === "reviewing")) ||
        runs.some((run) => briefIds.has(run.briefId) && (run.status === "queued" || run.status === "running" || run.status === "retrying"))
    );
}
