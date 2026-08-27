export type SoftDeleteReason =
    | "aesthetic_dislike"
    | "generation_failure"
    | "duplicate"
    | "text_garbled"
    | "policy_or_constraint";

export const DEFAULT_CREATIVE_BRIEF_PURPOSE = "审美训练与灵感采集";

export type FeedbackInput =
    | { kind: "rating"; rating: 1 | 2 | 3 | 4 | 5 }
    | { kind: "comment"; comment: string }
    | { kind: "soft_delete"; reason: SoftDeleteReason; note?: string }
    | { kind: "restore" }
    | { kind: "preference_feature_review"; featureId: string; decision: "confirm" | "edit" | "ignore" | "lock"; value?: string };

export type CreativeBrief = {
    id: string;
    requirementId?: string;
    revision?: number;
    supersedesBriefId?: string;
    supersededByBriefId?: string;
    supersededAt?: string;
    archivedAt?: string;
    subject: string;
    purpose: string;
    platform?: string;
    style?: string;
    scene?: string;
    aspectRatio: string;
    constraints: { keep: string[]; avoid: string[] };
    referenceImageIds: string[];
    strategy: "stable" | "balanced" | "explore";
    profileId: string;
    createdAt: string;
};

export type CreativeBriefInput = Omit<CreativeBrief, "id" | "requirementId" | "revision" | "supersedesBriefId" | "supersededByBriefId" | "supersededAt" | "archivedAt" | "createdAt" | "purpose" | "profileId"> & { purpose?: string; /** Legacy client field; ignored for preference scope. */ profileId?: string };

/** Legacy journal shape kept only so existing FrameFlow facts remain replayable. No active timer or Schedule API uses it. */
export type DailyCollectionSchedule = {
    id: string;
    name: string;
    briefId: string;
    dailyTime: string;
    timeZone: "Asia/Shanghai";
    count: number;
    enabled: boolean;
    lastAttemptKey?: string;
    lastTriggeredAt?: string;
    lastRunId?: string;
    lastError?: string;
    createdAt: string;
    updatedAt: string;
};

export type AutoRunState = "paused" | "generating" | "reviewing" | "completed" | "failed" | "awaiting_review";
export type AutoRunPauseReason = "user_requested";

export type AutoRun = {
    id: string;
    name: string;
    briefId: string;
    count: number;
    maxIterations: number;
    state: AutoRunState;
    iteration: number;
    currentRunId?: string;
    lastRunId?: string;
    lastStartedAt?: string;
    lastCompletedAt?: string;
    lastError?: string;
    createdAt: string;
    updatedAt: string;
};

export type AutoRunInput = Pick<AutoRun, "name" | "briefId" | "count" | "maxIterations">;

export type PromptFields = {
    subject: string[];
    composition: string[];
    color: string[];
    lighting: string[];
    material: string[];
    layout: string[];
    mood: string[];
    rendering: string[];
    technical: string[];
    negative: string[];
};

export type PromptFieldKey = keyof PromptFields;
export type PromptDisplayLanguage = "zh-CN";
export type PromptTranslation = {
    fields: PromptFields;
    compiledPrompt: string;
};
export type PromptLocks = Partial<Record<PromptFieldKey, string[]>>;
export type PromptFieldChange = {
    field: PromptFieldKey;
    before: string[];
    after: string[];
    reason: string;
    evidenceEventIds: string[];
    evidenceImageIds: string[];
};
export type PromptDiff = Record<"keep" | "add" | "change" | "remove" | "avoid", PromptFieldChange[]>;

export type PromptVersion = {
    id: string;
    parentId?: string;
    briefId: string;
    revision: number;
    status: "draft" | "approved" | "used";
    fields: PromptFields;
    compiledPrompt: string;
    translations?: Partial<Record<PromptDisplayLanguage, PromptTranslation>>;
    diff: PromptDiff;
    decisionId?: string;
    referenceImageIds: string[];
    locks: PromptLocks;
    reason: string;
    createdAt: string;
};

export type PromptDecisionPlan = {
    summary: string;
    evidence: Array<{
        imageId: string;
        disposition: "adopted" | "avoided" | "ignored";
        affectedFields: PromptFieldKey[];
        reason: string;
    }>;
};

export type PromptPlan = Pick<PromptVersion, "fields" | "compiledPrompt" | "translations" | "reason"> & { decision?: PromptDecisionPlan };

export type FrameFlowPreferenceEvidence = {
    imageId: string;
    sourceEventIds: string[];
    weight: number;
    rating?: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    promptVersionId?: string;
    fields?: PromptFields;
};
export type FrameFlowPreferenceContext = {
    briefId: string;
    totalWeight: number;
    sampleSize: number;
    qualityRejections: number;
    boost: FrameFlowPreferenceEvidence[];
    avoid: FrameFlowPreferenceEvidence[];
};

export type MachineReviewDecision = "keep" | "vary" | "reject";
export type MachineReview = {
    imageId: string;
    autoRunId: string;
    runId: string;
    iteration: number;
    rating: 1 | 2 | 3 | 4 | 5;
    comment: string;
    decision: MachineReviewDecision;
    strengths: string[];
    issues: string[];
    createdAt: string;
};

export type FrameFlowPromptPlanner = {
    plan(input: { brief: CreativeBrief; strategy: CreativeBrief["strategy"]; preference: FrameFlowPreferenceContext; machineReviews: MachineReview[] }): Promise<PromptPlan>;
    translate?(input: { prompt: PromptVersion; language: PromptDisplayLanguage }): Promise<PromptTranslation>;
};

export type FrameFlowImageReviewer = {
    review(input: { brief: CreativeBrief; prompt: PromptVersion; autoRunId: string; runId: string; iteration: number; images: Array<{ imageId: string; filePath: string }> }): Promise<Array<Omit<MachineReview, "autoRunId" | "runId" | "iteration" | "createdAt">>>;
};

export type AutoRunTrajectorySummaryDraft = {
    improved: Array<{ issue: string; evidenceIterations: number[]; explanation: string }>;
    recurring: Array<{ issue: string; evidenceIterations: number[]; recommendation: string }>;
    bestIteration: number;
    bestReason: string;
};

export type AutoRunTrajectorySummary = AutoRunTrajectorySummaryDraft & {
    autoRunId: string;
    throughIteration: number;
    createdAt: string;
};

export type AutoRunTrajectorySummaryInput = {
    brief: CreativeBrief;
    rounds: Array<{
        iteration: number;
        prompt: PromptVersion;
        machineReviews: MachineReview[];
    }>;
};

export type FrameFlowTrajectorySummarizer = {
    summarize(input: AutoRunTrajectorySummaryInput): Promise<AutoRunTrajectorySummaryDraft>;
};

export type FrameFlowImageGenerator = {
    generate(input: { prompt: PromptVersion; count: number; aspectRatio: string; cropPosition: "top" | "attention"; referenceFiles: string[]; signal: AbortSignal }): Promise<string[]>;
};

export type AgentDecisionEvidence = {
    imageId: string;
    sourceEventIds: string[];
    weight: number;
    rating?: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    sourcePromptVersionId?: string;
    disposition: "adopted" | "avoided" | "ignored";
    affectedFields: PromptFieldKey[];
    reason: string;
};

export type AgentDecision = {
    id: string;
    briefId: string;
    promptVersionId: string;
    profileId: string;
    summary: string;
    evidence: AgentDecisionEvidence[];
    createdAt: string;
};

export type GenerationRun = {
    id: string;
    briefId: string;
    promptVersionId: string;
    status: "queued" | "running" | "succeeded" | "partially_succeeded" | "failed" | "retrying" | "cancelled";
    requestedCount: number;
    slotIds: string[];
    imageIds: string[];
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
};

export type GenerationError = {
    code: "IMAGEGEN_FAILED" | "IMAGEGEN_MISSING_RESULT" | "IMAGE_VALIDATION_FAILED";
    message: string;
    retryable: boolean;
};

export type GenerationSlot = {
    id: string;
    runId: string;
    index: number;
    status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    attempts: number;
    imageId?: string;
    error?: GenerationError;
};

export type QuarantineReason = "generation_cancelled" | "journal_append_failed" | "asset_import_failed" | "orphan_recovery";

export type QuarantineRecord = {
    id: string;
    reason: QuarantineReason;
    runId?: string;
    promptVersionId?: string;
    imageId?: string;
    sourceName: string;
    relativePath: string;
    sha256: string;
    bytes: number;
    createdAt: string;
};

export type FrameFlowImageAsset = {
    id: string;
    runId: string;
    promptVersionId: string;
    parentImageId?: string;
    referenceImageIds: string[];
    file: { relativePath: string; sha256: string; bytes: number; mimeType: "image/png" };
    thumbnail: { relativePath: string; width: number; height: number };
    width: number;
    height: number;
    outputConstraint?: {
        aspectRatio: string;
        normalization: "none" | "center_crop" | "attention_crop" | "top_crop";
        sourceWidth: number;
        sourceHeight: number;
    };
    status: "pending_review" | "reviewed" | "hidden" | "restored" | "permanently_deleted";
    createdAt: string;
};

export type FrameFlowReferenceAsset = {
    id: string;
    source: { type: "browser_asset"; id: string; name: string };
    file: { relativePath: string; sha256: string; bytes: number; mimeType: "image/png" };
    width: number;
    height: number;
    createdAt: string;
};

export type FrameFlowReferenceImportInput = { sourceId: string; sourceName: string; idempotencyKey: string };

export type FrameFlowCommand =
    | { type: "brief.create"; input: CreativeBriefInput; idempotencyKey: string }
    | { type: "brief.revise"; briefId: string; sourceAutoRunId?: string; input: CreativeBriefInput; idempotencyKey: string }
    | { type: "brief.archive"; briefId: string; idempotencyKey: string }
    | { type: "brief.restore"; briefId: string; idempotencyKey: string }
    | { type: "auto_run.create"; input: AutoRunInput; idempotencyKey: string }
    | { type: "auto_run.update"; autoRunId: string; input: Partial<Pick<AutoRun, "name" | "count" | "maxIterations">>; idempotencyKey: string }
    | { type: "auto_run.start"; autoRunId: string; idempotencyKey: string }
    | { type: "auto_run.stop"; autoRunId: string; idempotencyKey: string }
    | { type: "auto_run.extend"; autoRunId: string; additionalIterations: number; idempotencyKey: string }
    | { type: "auto_run.advance"; autoRunId: string; idempotencyKey: string }
    | { type: "round.plan"; briefId: string; strategy: CreativeBrief["strategy"]; idempotencyKey: string }
    | { type: "prompt.translate"; promptVersionId: string; language: PromptDisplayLanguage; idempotencyKey: string }
    | { type: "prompt.approve"; promptVersionId: string; locks: PromptLocks; idempotencyKey: string }
    | { type: "run.start"; promptVersionId: string; count: number; idempotencyKey: string }
    | { type: "run.retry"; runId: string; failedSlotIds: string[]; idempotencyKey: string }
    | { type: "run.cancel"; runId: string; idempotencyKey: string }
    | { type: "image.delete"; imageId: string; idempotencyKey: string }
    | { type: "feedback.append"; imageId: string; feedback: FeedbackInput; idempotencyKey: string };

export type FrameFlowQuery =
    | { type: "workspace.summary" }
    | { type: "brief.list"; limit: number; includeArchived?: boolean }
    | { type: "brief.detail"; briefId: string }
    | { type: "auto_run.list"; limit: number; includeArchived?: boolean }
    | { type: "auto_run.trajectory"; autoRunId: string }
    | { type: "run.list"; limit: number; includeArchived?: boolean }
    | { type: "review.queue"; limit: number; includeArchived?: boolean }
    | { type: "prompt.lineage"; promptVersionId: string }
    | { type: "run.detail"; runId: string }
    | { type: "reference.list"; limit: number }
    | { type: "quarantine.list"; limit: number }
    | { type: "image.detail"; imageId: string }
    | { type: "preference.dna"; briefId: string }
    | { type: "event.history"; subjectId: string; cursor?: string; limit: number };

export type FrameFlowEvent =
    | { type: "brief.created"; eventId: string; brief: CreativeBrief }
    | { type: "brief.revised"; eventId: string; sourceBriefId: string; brief: CreativeBrief; supersededAt?: string; /** Legacy field kept for journals written before supersededAt was introduced. */ archivedAt?: string }
    | { type: "brief.archived"; eventId: string; briefId: string; requirementId?: string; archivedAt: string }
    | { type: "brief.restored"; eventId: string; briefId: string; requirementId: string; restoredAt: string }
    | { type: "auto_run.created"; eventId: string; autoRun: AutoRun }
    | { type: "auto_run.updated"; eventId: string; autoRun: AutoRun }
    | { type: "auto_run.iteration_started"; eventId: string; autoRunId: string; iteration: number; runId: string; startedAt: string }
    | { type: "auto_run.awaiting_review"; eventId: string; autoRunId: string; runId: string; completedAt: string }
    | { type: "auto_run.review_started"; eventId: string; autoRunId: string; runId: string; startedAt: string }
    | { type: "machine_review.recorded"; eventId: string; review: MachineReview }
    | { type: "auto_run.trajectory_summarized"; eventId: string; summary: AutoRunTrajectorySummary }
    | { type: "auto_run.completed"; eventId: string; autoRunId: string; runId: string; completedAt: string }
    | { type: "auto_run.extended"; eventId: string; autoRunId: string; previousMaxIterations: number; maxIterations: number; additionalIterations: number; extendedAt: string }
    | { type: "auto_run.paused"; eventId: string; autoRunId: string; pausedAt: string; /** Omitted only by journals written before stop reasons were recorded. */ reason?: AutoRunPauseReason }
    | { type: "auto_run.failed"; eventId: string; autoRunId: string; error: string; failedAt: string }
    | { type: "schedule.created"; eventId: string; schedule: DailyCollectionSchedule }
    | { type: "schedule.updated"; eventId: string; schedule: DailyCollectionSchedule }
    | { type: "schedule.triggered"; eventId: string; scheduleId: string; triggerKey: string; runId: string; triggeredAt: string }
    | { type: "schedule.trigger_failed"; eventId: string; scheduleId: string; triggerKey: string; error: string; failedAt: string }
    | { type: "prompt.version_created"; eventId: string; promptVersion: PromptVersion }
    | { type: "prompt.translation_created"; eventId: string; promptVersionId: string; language: PromptDisplayLanguage; translation: PromptTranslation }
    | { type: "agent.decision_recorded"; eventId: string; decision: AgentDecision }
    | { type: "prompt.approved"; eventId: string; promptVersionId: string; locks: PromptLocks }
    | { type: "reference.imported"; eventId: string; reference: FrameFlowReferenceAsset }
    | { type: "run.queued"; eventId: string; run: GenerationRun }
    | { type: "run.started"; eventId: string; runId: string; startedAt: string }
    | { type: "run.retry_started"; eventId: string; runId: string; slotIds: string[]; startedAt: string }
    | { type: "run.cancelled"; eventId: string; runId: string; cancelledAt: string }
    | { type: "run.slot_succeeded"; eventId: string; runId: string; slotId: string; imageId: string }
    | { type: "run.slot_failed"; eventId: string; runId: string; slotId: string; error: GenerationError }
    | { type: "image.registered"; eventId: string; image: FrameFlowImageAsset }
    | { type: "run.completed"; eventId: string; runId: string; status: "succeeded" | "partially_succeeded" | "failed"; completedAt: string }
    | { type: "feedback.rating_set"; eventId: string; imageId: string; rating: 1 | 2 | 3 | 4 | 5 }
    | { type: "feedback.comment_set"; eventId: string; imageId: string; comment: string }
    | { type: "image.soft_deleted"; eventId: string; imageId: string; reason: SoftDeleteReason; note?: string }
    | { type: "image.restored"; eventId: string; imageId: string }
    | { type: "image.permanently_deleted"; eventId: string; imageId: string }
    | { type: "preference.feature_reviewed"; eventId: string; imageId: string; featureId: string; decision: "confirm" | "edit" | "ignore" | "lock"; value?: string };

export type FrameFlowTransaction = {
    schemaVersion: 1;
    sequence: number;
    transactionId: string;
    idempotencyKey: string;
    occurredAt: string;
    actor: { type: "user" | "agent" | "system"; id?: string };
    events: FrameFlowEvent[];
};

export type FrameFlowCommandResult = {
    transactionId: string;
    sequence: number;
    eventIds: string[];
    resource?: { type: "brief" | "prompt_version" | "run" | "auto_run"; id: string };
};

export type PreferenceSignal = {
    imageId: string;
    weight: number;
    sourceEventIds: string[];
};

export type PreferenceDnaResult = {
    type: "preference.dna";
    briefId: string;
    totalWeight: number;
    sampleSize: number;
    boost: PreferenceSignal[];
    avoid: PreferenceSignal[];
    qualityRejections: number;
};

export type WorkspaceSummaryResult = {
    type: "workspace.summary";
    sequence: number;
    feedbackImages: number;
    qualityRejections: number;
    briefs: number;
    prompts: number;
    runs: number;
    images: number;
    decisions: number;
};

export type BriefDetailResult = { type: "brief.detail"; brief: CreativeBrief };
export type BriefListResult = { type: "brief.list"; briefs: CreativeBrief[] };
export type FrameFlowRequirementState = { requirementArchived: boolean; briefSuperseded: boolean };
export type AutoRunListResult = { type: "auto_run.list"; autoRuns: Array<AutoRun & FrameFlowRequirementState & { canContinueExploration: boolean }> };
export type AutoRunTrajectoryResult = {
    type: "auto_run.trajectory";
    autoRun: AutoRun & FrameFlowRequirementState & { canContinueExploration: boolean };
    brief: CreativeBrief;
    rounds: Array<{
        iteration: number;
        run: GenerationRun;
        prompt: PromptVersion;
        images: Array<{ image: FrameFlowImageAsset; machineReview?: MachineReview }>;
    }>;
    summary?: AutoRunTrajectorySummary;
};

export type EventHistoryResult = {
    type: "event.history";
    subjectId: string;
    events: Array<FrameFlowEvent & { sequence: number; occurredAt: string }>;
    nextCursor?: string;
};

export type PromptLineageResult = {
    type: "prompt.lineage";
    promptVersionId: string;
    versions: PromptVersion[];
    decisions: AgentDecision[];
};

export type RunListResult = { type: "run.list"; runs: Array<GenerationRun & FrameFlowRequirementState> };
export type RunDetailResult = { type: "run.detail"; run: GenerationRun; slots: GenerationSlot[] };
export type ReferenceListResult = { type: "reference.list"; items: FrameFlowReferenceAsset[] };
export type QuarantineListResult = { type: "quarantine.list"; items: QuarantineRecord[] };
export type ImageDetailResult = { type: "image.detail"; image: FrameFlowImageAsset };
export type FrameFlowReviewFeedback = { rating?: 1 | 2 | 3 | 4 | 5; comment?: string; hiddenReason?: SoftDeleteReason };
export type ReviewQueueResult = { type: "review.queue"; items: Array<FrameFlowRequirementState & { briefId: string; image: FrameFlowImageAsset; feedback: FrameFlowReviewFeedback; machineReview?: MachineReview }> };

export type FrameFlowQueryResult = PreferenceDnaResult | WorkspaceSummaryResult | BriefDetailResult | BriefListResult | AutoRunListResult | AutoRunTrajectoryResult | EventHistoryResult | PromptLineageResult | RunListResult | RunDetailResult | ReferenceListResult | QuarantineListResult | ImageDetailResult | ReviewQueueResult;
