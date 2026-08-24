import { fetchAgentJson } from "./canvas-agent";

export type FrameFlowRunStatus = "queued" | "running" | "succeeded" | "partially_succeeded" | "failed" | "retrying" | "cancelled";
export type FrameFlowStrategy = "stable" | "balanced" | "explore";
export type FrameFlowBriefInput = {
    subject: string;
    purpose?: string;
    platform?: string;
    style?: string;
    scene?: string;
    aspectRatio: string;
    constraints: { keep: string[]; avoid: string[] };
    referenceImageIds: string[];
    strategy: FrameFlowStrategy;
};
export type FrameFlowBrief = FrameFlowBriefInput & {
    id: string;
    requirementId?: string;
    revision?: number;
    supersedesBriefId?: string;
    supersededByBriefId?: string;
    supersededAt?: string;
    archivedAt?: string;
    profileId: string;
    createdAt: string;
};
export type FrameFlowAutoRunState = "paused" | "generating" | "reviewing" | "completed" | "failed" | "awaiting_review";
export type FrameFlowAutoRun = {
    id: string;
    name: string;
    briefId: string;
    count: number;
    maxIterations: number;
    canContinueExploration: boolean;
    state: FrameFlowAutoRunState;
    iteration: number;
    currentRunId?: string;
    lastRunId?: string;
    lastStartedAt?: string;
    lastCompletedAt?: string;
    lastError?: string;
    requirementArchived: boolean;
    briefSuperseded: boolean;
    createdAt: string;
    updatedAt: string;
};
export type FrameFlowReferenceAsset = {
    id: string;
    source: { type: "browser_asset"; id: string; name: string };
    file: { relativePath: string; sha256: string; bytes: number; mimeType: "image/png" };
    width: number;
    height: number;
    createdAt: string;
};
export type FrameFlowPromptFields = Record<"subject" | "composition" | "color" | "lighting" | "material" | "layout" | "mood" | "rendering" | "technical" | "negative", string[]>;
export type FrameFlowPromptTranslation = { fields: FrameFlowPromptFields; compiledPrompt: string };
export type FrameFlowPromptFieldKey = keyof FrameFlowPromptFields;
export type FrameFlowPromptFieldChange = {
    field: FrameFlowPromptFieldKey;
    before: string[];
    after: string[];
    reason: string;
    evidenceEventIds: string[];
    evidenceImageIds: string[];
};
export type FrameFlowPromptDiff = Record<"keep" | "add" | "change" | "remove" | "avoid", FrameFlowPromptFieldChange[]>;
export type FrameFlowPromptVersion = {
    id: string;
    parentId?: string;
    briefId: string;
    revision: number;
    status: "draft" | "approved" | "used";
    fields: FrameFlowPromptFields;
    compiledPrompt: string;
    translations?: Partial<Record<"zh-CN", FrameFlowPromptTranslation>>;
    reason: string;
    diff: FrameFlowPromptDiff;
    decisionId?: string;
    referenceImageIds: string[];
    createdAt: string;
};
export type FrameFlowAgentDecisionEvidence = {
    imageId: string;
    sourceEventIds: string[];
    weight: number;
    rating?: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    sourcePromptVersionId?: string;
    disposition: "adopted" | "avoided" | "ignored";
    affectedFields: FrameFlowPromptFieldKey[];
    reason: string;
};
export type FrameFlowAgentDecision = {
    id: string;
    briefId: string;
    promptVersionId: string;
    profileId: string;
    summary: string;
    evidence: FrameFlowAgentDecisionEvidence[];
    createdAt: string;
};
export type FrameFlowPromptLineage = { type: "prompt.lineage"; promptVersionId: string; versions: FrameFlowPromptVersion[]; decisions: FrameFlowAgentDecision[] };
export type FrameFlowRun = {
    id: string;
    briefId: string;
    promptVersionId: string;
    status: FrameFlowRunStatus;
    requestedCount: number;
    slotIds: string[];
    imageIds: string[];
    requirementArchived?: boolean;
    briefSuperseded?: boolean;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
};
export type FrameFlowGenerationSlot = {
    id: string;
    runId: string;
    index: number;
    status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    attempts: number;
    imageId?: string;
    error?: { code: "IMAGEGEN_FAILED" | "IMAGEGEN_MISSING_RESULT" | "IMAGE_VALIDATION_FAILED"; message: string; retryable: boolean };
};
export type FrameFlowQuarantineRecord = {
    id: string;
    reason: "generation_cancelled" | "journal_append_failed" | "asset_import_failed" | "orphan_recovery";
    runId?: string;
    promptVersionId?: string;
    imageId?: string;
    sourceName: string;
    relativePath: string;
    sha256: string;
    bytes: number;
    createdAt: string;
};
export type FrameFlowRunDetail = { type: "run.detail"; run: FrameFlowRun; slots: FrameFlowGenerationSlot[] };
export type FrameFlowImageStatus = "pending_review" | "reviewed" | "hidden" | "restored" | "permanently_deleted";
export type FrameFlowImageAsset = {
    id: string;
    runId: string;
    promptVersionId: string;
    referenceImageIds: string[];
    width: number;
    height: number;
    outputConstraint?: {
        aspectRatio: string;
        normalization: "none" | "center_crop" | "attention_crop" | "top_crop";
        sourceWidth: number;
        sourceHeight: number;
    };
    status: FrameFlowImageStatus;
    createdAt: string;
};
export type FrameFlowReviewFeedback = {
    rating?: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    hiddenReason?: "aesthetic_dislike" | "generation_failure" | "duplicate" | "text_garbled" | "policy_or_constraint";
};
export type FrameFlowMachineReview = {
    imageId: string;
    autoRunId: string;
    runId: string;
    iteration: number;
    rating: 1 | 2 | 3 | 4 | 5;
    comment: string;
    decision: "keep" | "vary" | "reject";
    strengths: string[];
    issues: string[];
    createdAt: string;
};
export type FrameFlowReviewItem = {
    briefId: string;
    requirementArchived: boolean;
    briefSuperseded: boolean;
    image: FrameFlowImageAsset;
    feedback: FrameFlowReviewFeedback;
    machineReview?: FrameFlowMachineReview;
};
export type FrameFlowAutoRunTrajectorySummary = {
    autoRunId: string;
    throughIteration: number;
    improved: Array<{ issue: string; evidenceIterations: number[]; explanation: string }>;
    recurring: Array<{ issue: string; evidenceIterations: number[]; recommendation: string }>;
    bestIteration: number;
    bestReason: string;
    createdAt: string;
};
export type FrameFlowAutoRunTrajectory = {
    type: "auto_run.trajectory";
    autoRun: FrameFlowAutoRun;
    brief: FrameFlowBrief;
    rounds: Array<{
        iteration: number;
        run: FrameFlowRun;
        prompt: FrameFlowPromptVersion;
        images: Array<{ image: FrameFlowImageAsset; machineReview?: FrameFlowMachineReview }>;
    }>;
    summary?: FrameFlowAutoRunTrajectorySummary;
};
export type FrameFlowPreferenceSignal = { imageId: string; weight: number; sourceEventIds: string[] };
export type FrameFlowPreferenceDna = {
    type: "preference.dna";
    briefId: string;
    totalWeight: number;
    sampleSize: number;
    boost: FrameFlowPreferenceSignal[];
    avoid: FrameFlowPreferenceSignal[];
    qualityRejections: number;
};

type FrameFlowResponse<T> = { ok: true; data: T };
type FrameFlowCommandReceipt = { resource?: { type: "brief" | "prompt_version" | "run" | "auto_run"; id: string } };

export async function createFrameFlowBrief(endpoint: string, token: string, input: FrameFlowBriefInput, idempotencyKey: string) {
    const receipt = await frameFlowCommand(endpoint, token, { type: "brief.create", input, idempotencyKey });
    const briefId = requiredResourceId(receipt, "brief");
    return getFrameFlowBrief(endpoint, token, briefId);
}

export async function reviseFrameFlowBrief(endpoint: string, token: string, briefId: string, input: FrameFlowBriefInput, sourceAutoRunId?: string) {
    const receipt = await frameFlowCommand(endpoint, token, { type: "brief.revise", briefId, ...(sourceAutoRunId ? { sourceAutoRunId } : {}), input, idempotencyKey: crypto.randomUUID() });
    return getFrameFlowBrief(endpoint, token, requiredResourceId(receipt, "brief"));
}

export async function archiveFrameFlowBrief(endpoint: string, token: string, briefId: string) {
    return frameFlowCommand(endpoint, token, { type: "brief.archive", briefId, idempotencyKey: crypto.randomUUID() });
}

export async function restoreFrameFlowBrief(endpoint: string, token: string, briefId: string) {
    return frameFlowCommand(endpoint, token, { type: "brief.restore", briefId, idempotencyKey: crypto.randomUUID() });
}

export async function getFrameFlowBrief(endpoint: string, token: string, briefId: string) {
    const response = await frameFlowQuery<{ type: "brief.detail"; brief: FrameFlowBrief }>(endpoint, token, { type: "brief.detail", briefId });
    return response.brief;
}

export async function getFrameFlowCurrentBrief(endpoint: string, token: string, briefId: string) {
    const visited = new Set<string>();
    let current = await getFrameFlowBrief(endpoint, token, briefId);
    while (current.supersededByBriefId && !visited.has(current.id)) {
        visited.add(current.id);
        current = await getFrameFlowBrief(endpoint, token, current.supersededByBriefId);
    }
    return current;
}

export async function listFrameFlowBriefs(endpoint: string, token: string, limit = 200, includeArchived = false) {
    const response = await frameFlowQuery<{ type: "brief.list"; briefs: FrameFlowBrief[] }>(endpoint, token, { type: "brief.list", limit, includeArchived });
    return response.briefs;
}

export async function listFrameFlowAutoRuns(endpoint: string, token: string, limit = 200, includeArchived = false) {
    const response = await frameFlowQuery<{ type: "auto_run.list"; autoRuns: FrameFlowAutoRun[] }>(endpoint, token, { type: "auto_run.list", limit, includeArchived });
    return response.autoRuns;
}

export async function getFrameFlowAutoRunTrajectory(endpoint: string, token: string, autoRunId: string) {
    return frameFlowQuery<FrameFlowAutoRunTrajectory>(endpoint, token, { type: "auto_run.trajectory", autoRunId });
}

export async function getFrameFlowAutoRun(endpoint: string, token: string, autoRunId: string) {
    return (await getFrameFlowAutoRunTrajectory(endpoint, token, autoRunId)).autoRun;
}

export async function summarizeFrameFlowAutoRunTrajectory(endpoint: string, token: string, autoRunId: string, force = false) {
    const response = await fetchAgentJson<FrameFlowResponse<{ summary: FrameFlowAutoRunTrajectorySummary }>>(endpoint, token, `/agent/frameflow/auto-runs/${encodeURIComponent(autoRunId)}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
    });
    return response.data.summary;
}

export async function createFrameFlowAutoRun(endpoint: string, token: string, input: Pick<FrameFlowAutoRun, "name" | "briefId" | "count" | "maxIterations">) {
    const receipt = await frameFlowCommand(endpoint, token, { type: "auto_run.create", input, idempotencyKey: crypto.randomUUID() });
    return requiredResourceId(receipt, "auto_run");
}

export async function updateFrameFlowAutoRun(endpoint: string, token: string, autoRunId: string, input: Partial<Pick<FrameFlowAutoRun, "name" | "count" | "maxIterations">>) {
    return frameFlowCommand(endpoint, token, { type: "auto_run.update", autoRunId, input, idempotencyKey: crypto.randomUUID() });
}

export async function stopFrameFlowAutoRun(endpoint: string, token: string, autoRunId: string) {
    return frameFlowCommand(endpoint, token, { type: "auto_run.stop", autoRunId, idempotencyKey: crypto.randomUUID() });
}

export async function extendFrameFlowAutoRun(endpoint: string, token: string, autoRunId: string, additionalIterations = 1) {
    return frameFlowCommand(endpoint, token, { type: "auto_run.extend", autoRunId, additionalIterations, idempotencyKey: crypto.randomUUID() });
}

export async function startFrameFlowAutoRun(endpoint: string, token: string, autoRunId: string) {
    const response = await fetchAgentJson<FrameFlowResponse<FrameFlowCommandReceipt>>(endpoint, token, `/agent/frameflow/auto-runs/${encodeURIComponent(autoRunId)}/start`, { method: "POST" });
    return response.data;
}

export async function advanceFrameFlowAutoRun(endpoint: string, token: string, autoRunId: string) {
    const response = await fetchAgentJson<FrameFlowResponse<FrameFlowCommandReceipt>>(endpoint, token, `/agent/frameflow/auto-runs/${encodeURIComponent(autoRunId)}/advance`, { method: "POST" });
    return requiredResourceId(response.data, "run");
}

export async function importFrameFlowReference(
    endpoint: string,
    token: string,
    input: { sourceId: string; sourceName: string; idempotencyKey: string; png: Blob },
) {
    const query = new URLSearchParams({ sourceId: input.sourceId, sourceName: input.sourceName, idempotencyKey: input.idempotencyKey });
    const response = await fetchAgentJson<FrameFlowResponse<{ reference: FrameFlowReferenceAsset }>>(
        endpoint,
        token,
        `/agent/frameflow/references/import?${query.toString()}`,
        { method: "POST", headers: { "content-type": "image/png" }, body: input.png },
    );
    return response.data.reference;
}

export async function planFrameFlowRound(endpoint: string, token: string, briefId: string, strategy: FrameFlowStrategy, idempotencyKey: string) {
    const receipt = await frameFlowCommand(endpoint, token, { type: "round.plan", briefId, strategy, idempotencyKey });
    const promptVersionId = requiredResourceId(receipt, "prompt_version");
    return getFrameFlowPrompt(endpoint, token, promptVersionId);
}

export async function approveFrameFlowPrompt(endpoint: string, token: string, promptVersionId: string, idempotencyKey: string) {
    await frameFlowCommand(endpoint, token, { type: "prompt.approve", promptVersionId, locks: {}, idempotencyKey });
    return getFrameFlowPrompt(endpoint, token, promptVersionId);
}

export async function translateFrameFlowPrompt(endpoint: string, token: string, promptVersionId: string, idempotencyKey: string) {
    await frameFlowCommand(endpoint, token, { type: "prompt.translate", promptVersionId, language: "zh-CN", idempotencyKey });
    return getFrameFlowPrompt(endpoint, token, promptVersionId);
}

export async function startFrameFlowRun(endpoint: string, token: string, promptVersionId: string, count: number, idempotencyKey: string) {
    const receipt = await frameFlowCommand(endpoint, token, { type: "run.start", promptVersionId, count, idempotencyKey });
    return requiredResourceId(receipt, "run");
}

export async function getFrameFlowPrompt(endpoint: string, token: string, promptVersionId: string) {
    const response = await getFrameFlowPromptLineage(endpoint, token, promptVersionId);
    const prompt = response.versions.find((version) => version.id === promptVersionId);
    if (!prompt) throw new Error("FrameFlow 未返回 Prompt Version");
    return prompt;
}

export async function getFrameFlowPromptLineage(endpoint: string, token: string, promptVersionId: string) {
    return frameFlowQuery<FrameFlowPromptLineage>(endpoint, token, { type: "prompt.lineage", promptVersionId });
}

export async function listFrameFlowRuns(endpoint: string, token: string, limit = 100, includeArchived = false) {
    const response = await frameFlowQuery<{ type: "run.list"; runs: FrameFlowRun[] }>(endpoint, token, { type: "run.list", limit, includeArchived });
    return response.runs;
}

export async function listFrameFlowReviewQueue(endpoint: string, token: string, limit = 200, includeArchived = false) {
    const response = await frameFlowQuery<{ type: "review.queue"; items: FrameFlowReviewItem[] }>(endpoint, token, { type: "review.queue", limit, includeArchived });
    return response.items;
}

export async function getFrameFlowPreferenceDna(endpoint: string, token: string, briefId: string) {
    return frameFlowQuery<FrameFlowPreferenceDna>(endpoint, token, { type: "preference.dna", briefId });
}

export async function rateFrameFlowImage(endpoint: string, token: string, imageId: string, rating: 1 | 2 | 3 | 4 | 5) {
    return appendFrameFlowFeedback(endpoint, token, imageId, { kind: "rating", rating });
}

export async function commentFrameFlowImage(endpoint: string, token: string, imageId: string, comment: string) {
    return appendFrameFlowFeedback(endpoint, token, imageId, { kind: "comment", comment });
}

export async function hideFrameFlowImage(endpoint: string, token: string, imageId: string) {
    return appendFrameFlowFeedback(endpoint, token, imageId, { kind: "soft_delete", reason: "aesthetic_dislike" });
}

export async function deleteFrameFlowImage(endpoint: string, token: string, imageId: string) {
    return frameFlowCommand(endpoint, token, { type: "image.delete", imageId, idempotencyKey: crypto.randomUUID() });
}

export async function restoreFrameFlowImage(endpoint: string, token: string, imageId: string) {
    return appendFrameFlowFeedback(endpoint, token, imageId, { kind: "restore" });
}

export async function getFrameFlowRun(endpoint: string, token: string, runId: string) {
    return frameFlowQuery<FrameFlowRunDetail>(endpoint, token, { type: "run.detail", runId });
}

export async function retryFrameFlowSlots(endpoint: string, token: string, runId: string, failedSlotIds: string[]) {
    const response = await fetchAgentJson<FrameFlowResponse<{ resource?: { type: "run"; id: string } }>>(
        endpoint,
        token,
        "/agent/frameflow/commands",
        jsonPost({
            type: "run.retry",
            runId,
            failedSlotIds,
            idempotencyKey: crypto.randomUUID(),
        }),
    );
    return response.data;
}

export async function cancelFrameFlowRun(endpoint: string, token: string, runId: string) {
    return frameFlowCommand(endpoint, token, { type: "run.cancel", runId, idempotencyKey: crypto.randomUUID() });
}

export async function listFrameFlowQuarantine(endpoint: string, token: string, limit = 50) {
    const response = await frameFlowQuery<{ type: "quarantine.list"; items: FrameFlowQuarantineRecord[] }>(endpoint, token, { type: "quarantine.list", limit });
    return response.items;
}

export function frameFlowImageUrl(endpoint: string, token: string, imageId: string) {
    return `${endpoint}/agent/frameflow/assets/${encodeURIComponent(imageId)}/thumbnail?token=${encodeURIComponent(token)}`;
}

async function frameFlowCommand(endpoint: string, token: string, body: unknown) {
    const response = await fetchAgentJson<FrameFlowResponse<FrameFlowCommandReceipt>>(endpoint, token, "/agent/frameflow/commands", jsonPost(body));
    return response.data;
}

async function appendFrameFlowFeedback(endpoint: string, token: string, imageId: string, feedback: unknown) {
    return frameFlowCommand(endpoint, token, { type: "feedback.append", imageId, feedback, idempotencyKey: crypto.randomUUID() });
}

async function frameFlowQuery<T>(endpoint: string, token: string, body: unknown) {
    const response = await fetchAgentJson<FrameFlowResponse<T>>(endpoint, token, "/agent/frameflow/query", jsonPost(body));
    return response.data;
}

function requiredResourceId(receipt: FrameFlowCommandReceipt, type: NonNullable<FrameFlowCommandReceipt["resource"]>["type"]) {
    if (receipt.resource?.type !== type || !receipt.resource.id) throw new Error(`FrameFlow 未返回 ${type} 资源`);
    return receipt.resource.id;
}

function jsonPost(body: unknown): RequestInit {
    return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
