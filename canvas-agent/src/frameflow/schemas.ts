import { z } from "zod";

import { DEFAULT_CREATIVE_BRIEF_PURPOSE } from "./types.js";

const text = z.string().trim().min(1).max(2_000);
const id = z.string().trim().min(1).max(200);
const eventId = z.string().uuid();
const softDeleteReasonSchema = z.enum(["aesthetic_dislike", "generation_failure", "duplicate", "text_garbled", "policy_or_constraint"]);

export const feedbackInputSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("rating"), rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) }).strict(),
    z.object({ kind: z.literal("comment"), comment: text }).strict(),
    z.object({ kind: z.literal("soft_delete"), reason: softDeleteReasonSchema, note: text.optional() }).strict(),
    z.object({ kind: z.literal("restore") }).strict(),
    z.object({
        kind: z.literal("preference_feature_review"),
        featureId: id,
        decision: z.enum(["confirm", "edit", "ignore", "lock"]),
        value: text.optional(),
    }).strict(),
]);

const shortText = z.string().trim().min(1).max(500);
const aspectRatioSchema = z.enum(["1:1", "4:5", "3:4", "16:9", "9:16"]);
const creativeBriefInputSchema = z.object({
    subject: shortText,
    purpose: z.preprocess((value) => typeof value === "string" && !value.trim() ? undefined : value, shortText.optional().default(DEFAULT_CREATIVE_BRIEF_PURPOSE)),
    platform: shortText.optional(),
    style: shortText.optional(),
    scene: shortText.optional(),
    aspectRatio: aspectRatioSchema,
    constraints: z.object({ keep: z.array(shortText).max(100), avoid: z.array(shortText).max(100) }).strict(),
    referenceImageIds: z.array(id).max(20),
    strategy: z.enum(["stable", "balanced", "explore"]),
    profileId: id.optional(),
}).strict();
const creativeBriefSchema = creativeBriefInputSchema.extend({
    id,
    requirementId: id.optional(),
    revision: z.number().int().positive().optional(),
    supersedesBriefId: id.optional(),
    supersededByBriefId: id.optional(),
    supersededAt: z.string().datetime().optional(),
    archivedAt: z.string().datetime().optional(),
    profileId: id,
    createdAt: z.string().datetime(),
}).strict();
const dailyTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const scheduleInputSchema = z.object({
    name: shortText,
    briefId: id,
    dailyTime: dailyTimeSchema,
    timeZone: z.literal("Asia/Shanghai"),
    count: z.number().int().min(1).max(8),
    enabled: z.boolean(),
}).strict();
const scheduleSchema = scheduleInputSchema.extend({
    id,
    lastAttemptKey: id.optional(),
    lastTriggeredAt: z.string().datetime().optional(),
    lastRunId: id.optional(),
    lastError: z.string().trim().min(1).max(500).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).strict();
const autoRunStateSchema = z.enum(["paused", "generating", "reviewing", "completed", "failed", "awaiting_review"]);
const autoRunInputSchema = z.object({
    name: shortText,
    briefId: id,
    count: z.number().int().min(1).max(8),
    maxIterations: z.number().int().min(1).max(20).default(5),
}).strict();
const autoRunSchema = autoRunInputSchema.extend({
    id,
    state: autoRunStateSchema,
    iteration: z.number().int().min(0),
    currentRunId: id.optional(),
    lastRunId: id.optional(),
    lastStartedAt: z.string().datetime().optional(),
    lastCompletedAt: z.string().datetime().optional(),
    lastError: z.string().trim().min(1).max(500).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).strict();

const promptFieldKeySchema = z.enum(["subject", "composition", "color", "lighting", "material", "layout", "mood", "rendering", "technical", "negative"]);
const promptValueListSchema = z.array(shortText).max(100);
export const promptFieldsSchema = z.object({
    subject: promptValueListSchema,
    composition: promptValueListSchema,
    color: promptValueListSchema,
    lighting: promptValueListSchema,
    material: promptValueListSchema,
    layout: promptValueListSchema,
    mood: promptValueListSchema,
    rendering: promptValueListSchema,
    technical: promptValueListSchema,
    negative: promptValueListSchema,
}).strict();
export const promptTranslationSchema = z.object({
    fields: promptFieldsSchema,
    compiledPrompt: z.string().trim().min(1).max(12_000),
}).strict();
export const promptLocksSchema = z.object({
    subject: promptValueListSchema.optional(),
    composition: promptValueListSchema.optional(),
    color: promptValueListSchema.optional(),
    lighting: promptValueListSchema.optional(),
    material: promptValueListSchema.optional(),
    layout: promptValueListSchema.optional(),
    mood: promptValueListSchema.optional(),
    rendering: promptValueListSchema.optional(),
    technical: promptValueListSchema.optional(),
    negative: promptValueListSchema.optional(),
}).strict();
export const promptPlanSchema = z.object({
    fields: promptFieldsSchema,
    compiledPrompt: z.string().trim().min(1).max(12_000),
    translations: z.object({ "zh-CN": promptTranslationSchema.optional() }).strict().optional(),
    reason: z.string().trim().min(1).max(2_000),
    decision: z.object({
        summary: z.string().trim().min(1).max(2_000),
        evidence: z.array(z.object({
            imageId: id,
            disposition: z.enum(["adopted", "avoided", "ignored"]),
            affectedFields: z.array(promptFieldKeySchema).min(1).max(10),
            reason: text,
        }).strict()).max(200),
    }).strict().optional(),
}).strict();
export const machineReviewResultSchema = z.object({
    imageId: id,
    rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    comment: text,
    decision: z.enum(["keep", "vary", "reject"]),
    strengths: z.array(shortText).max(20),
    issues: z.array(shortText).max(20),
}).strict();
export const autoRunTrajectorySummaryDraftSchema = z.object({
    improved: z.array(z.object({
        issue: shortText,
        evidenceIterations: z.array(z.number().int().min(1).max(20)).min(1).max(20),
        explanation: text,
    }).strict()).max(20),
    recurring: z.array(z.object({
        issue: shortText,
        evidenceIterations: z.array(z.number().int().min(1).max(20)).min(1).max(20),
        recommendation: text,
    }).strict()).max(20),
    bestIteration: z.number().int().min(1).max(20),
    bestReason: text,
}).strict();
const autoRunTrajectorySummarySchema = autoRunTrajectorySummaryDraftSchema.extend({
    autoRunId: id,
    throughIteration: z.number().int().min(1).max(20),
    createdAt: z.string().datetime(),
}).strict();
const machineReviewSchema = machineReviewResultSchema.extend({
    autoRunId: id,
    runId: id,
    iteration: z.number().int().positive(),
    createdAt: z.string().datetime(),
}).strict();
const promptFieldChangeSchema = z.object({
    field: promptFieldKeySchema,
    before: promptValueListSchema,
    after: promptValueListSchema,
    reason: text,
    evidenceEventIds: z.array(id).max(200),
    evidenceImageIds: z.array(id).max(200),
}).strict();
const promptDiffSchema = z.object({
    keep: z.array(promptFieldChangeSchema),
    add: z.array(promptFieldChangeSchema),
    change: z.array(promptFieldChangeSchema),
    remove: z.array(promptFieldChangeSchema),
    avoid: z.array(promptFieldChangeSchema),
}).strict();
const promptVersionSchema = promptPlanSchema.omit({ decision: true }).extend({
    id,
    parentId: id.optional(),
    briefId: id,
    revision: z.number().int().positive(),
    status: z.enum(["draft", "approved", "used"]),
    diff: promptDiffSchema,
    decisionId: id.optional(),
    referenceImageIds: z.array(id).max(20),
    locks: promptLocksSchema,
    createdAt: z.string().datetime(),
}).strict();
const agentDecisionEvidenceSchema = z.object({
    imageId: id,
    sourceEventIds: z.array(id).min(1).max(200),
    weight: z.number().int().min(-4).max(3),
    rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
    comment: text.optional(),
    sourcePromptVersionId: id.optional(),
    disposition: z.enum(["adopted", "avoided", "ignored"]),
    affectedFields: z.array(promptFieldKeySchema).min(1).max(10),
    reason: text,
}).strict();
const agentDecisionSchema = z.object({
    id,
    briefId: id,
    promptVersionId: id,
    profileId: id,
    summary: text,
    evidence: z.array(agentDecisionEvidenceSchema).max(200),
    createdAt: z.string().datetime(),
}).strict();
const generationRunSchema = z.object({
    id,
    briefId: id,
    promptVersionId: id,
    status: z.enum(["queued", "running", "succeeded", "partially_succeeded", "failed", "retrying", "cancelled"]),
    requestedCount: z.number().int().min(1).max(8),
    slotIds: z.array(id).min(1).max(8),
    imageIds: z.array(id).max(8),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
}).strict();
const generationErrorSchema = z.object({
    code: z.enum(["IMAGEGEN_FAILED", "IMAGEGEN_MISSING_RESULT", "IMAGE_VALIDATION_FAILED"]),
    message: z.string().trim().min(1).max(500),
    retryable: z.boolean(),
}).strict();
const imageAssetSchema = z.object({
    id,
    runId: id,
    promptVersionId: id,
    parentImageId: id.optional(),
    referenceImageIds: z.array(id).max(20),
    file: z.object({ relativePath: z.string().regex(/^assets\/originals\/[a-f0-9-]+\.png$/), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive(), mimeType: z.literal("image/png") }).strict(),
    thumbnail: z.object({ relativePath: z.string().min(1), width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    outputConstraint: z.object({
        aspectRatio: aspectRatioSchema,
        normalization: z.enum(["none", "center_crop", "attention_crop", "top_crop"]),
        sourceWidth: z.number().int().positive(),
        sourceHeight: z.number().int().positive(),
    }).strict().optional(),
    status: z.enum(["pending_review", "reviewed", "hidden", "restored", "permanently_deleted"]),
    createdAt: z.string().datetime(),
}).strict();
const referenceAssetSchema = z.object({
    id,
    source: z.object({ type: z.literal("browser_asset"), id, name: shortText }).strict(),
    file: z.object({ relativePath: z.string().regex(/^assets\/references\/[a-f0-9-]+\.png$/), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive(), mimeType: z.literal("image/png") }).strict(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    createdAt: z.string().datetime(),
}).strict();

export const referenceImportInputSchema = z.object({ sourceId: id, sourceName: shortText, idempotencyKey: id }).strict();

export const frameFlowCommandSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("brief.create"), input: creativeBriefInputSchema, idempotencyKey: id }).strict(),
    z.object({ type: z.literal("brief.revise"), briefId: id, sourceAutoRunId: id.optional(), input: creativeBriefInputSchema, idempotencyKey: id }).strict(),
    z.object({ type: z.literal("brief.archive"), briefId: id, idempotencyKey: id }).strict(),
    z.object({ type: z.literal("brief.restore"), briefId: id, idempotencyKey: id }).strict(),
    z.object({ type: z.literal("auto_run.create"), input: autoRunInputSchema, idempotencyKey: id }).strict(),
    z.object({
        type: z.literal("auto_run.update"),
        autoRunId: id,
        input: z.object({ name: shortText.optional(), count: z.number().int().min(1).max(8).optional(), maxIterations: z.number().int().min(1).max(20).optional() }).strict(),
        idempotencyKey: id,
    }).strict(),
    z.object({ type: z.literal("auto_run.start"), autoRunId: id, idempotencyKey: id }).strict(),
    z.object({ type: z.literal("auto_run.stop"), autoRunId: id, idempotencyKey: id }).strict(),
    z.object({ type: z.literal("auto_run.extend"), autoRunId: id, additionalIterations: z.number().int().min(1).max(20), idempotencyKey: id }).strict(),
    z.object({ type: z.literal("auto_run.advance"), autoRunId: id, idempotencyKey: id }).strict(),
    z.object({ type: z.literal("round.plan"), briefId: id, strategy: z.enum(["stable", "balanced", "explore"]), idempotencyKey: id }).strict(),
    z.object({ type: z.literal("prompt.translate"), promptVersionId: id, language: z.literal("zh-CN"), idempotencyKey: id }).strict(),
    z.object({ type: z.literal("prompt.approve"), promptVersionId: id, locks: promptLocksSchema, idempotencyKey: id }).strict(),
    z.object({ type: z.literal("run.start"), promptVersionId: id, count: z.number().int().min(1).max(8), idempotencyKey: id }).strict(),
    z.object({ type: z.literal("run.retry"), runId: id, failedSlotIds: z.array(id).min(1).max(8), idempotencyKey: id }).strict(),
    z.object({ type: z.literal("run.cancel"), runId: id, idempotencyKey: id }).strict(),
    z.object({ type: z.literal("image.delete"), imageId: id, idempotencyKey: id }).strict(),
    z.object({ type: z.literal("feedback.append"), imageId: id, feedback: feedbackInputSchema, idempotencyKey: id }).strict(),
]);

export const frameFlowQuerySchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("workspace.summary") }).strict(),
    z.object({ type: z.literal("brief.list"), limit: z.number().int().min(1).max(200), includeArchived: z.boolean().optional().default(false) }).strict(),
    z.object({ type: z.literal("brief.detail"), briefId: id }).strict(),
    z.object({ type: z.literal("auto_run.list"), limit: z.number().int().min(1).max(200), includeArchived: z.boolean().optional().default(false) }).strict(),
    z.object({ type: z.literal("auto_run.trajectory"), autoRunId: id }).strict(),
    z.object({ type: z.literal("run.list"), limit: z.number().int().min(1).max(200), includeArchived: z.boolean().optional().default(false) }).strict(),
    z.object({ type: z.literal("review.queue"), limit: z.number().int().min(1).max(200), includeArchived: z.boolean().optional().default(false) }).strict(),
    z.object({ type: z.literal("prompt.lineage"), promptVersionId: id }).strict(),
    z.object({ type: z.literal("run.detail"), runId: id }).strict(),
    z.object({ type: z.literal("reference.list"), limit: z.number().int().min(1).max(200) }).strict(),
    z.object({ type: z.literal("quarantine.list"), limit: z.number().int().min(1).max(200) }).strict(),
    z.object({ type: z.literal("image.detail"), imageId: id }).strict(),
    z.object({ type: z.literal("preference.dna"), briefId: id }).strict(),
    z.object({ type: z.literal("event.history"), subjectId: id, cursor: id.optional(), limit: z.number().int().min(1).max(200) }).strict(),
]);

const feedbackEventSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("brief.created"),
        eventId,
        brief: creativeBriefSchema,
    }).strict(),
    z.object({
        type: z.literal("brief.revised"), eventId, sourceBriefId: id, brief: creativeBriefSchema,
        supersededAt: z.string().datetime().optional(),
        archivedAt: z.string().datetime().optional(),
    }).strict(),
    z.object({ type: z.literal("brief.archived"), eventId, briefId: id, requirementId: id.optional(), archivedAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("brief.restored"), eventId, briefId: id, requirementId: id, restoredAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("auto_run.created"), eventId, autoRun: autoRunSchema }).strict(),
    z.object({ type: z.literal("auto_run.updated"), eventId, autoRun: autoRunSchema }).strict(),
    z.object({ type: z.literal("auto_run.iteration_started"), eventId, autoRunId: id, iteration: z.number().int().positive(), runId: id, startedAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("auto_run.awaiting_review"), eventId, autoRunId: id, runId: id, completedAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("auto_run.review_started"), eventId, autoRunId: id, runId: id, startedAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("machine_review.recorded"), eventId, review: machineReviewSchema }).strict(),
    z.object({ type: z.literal("auto_run.trajectory_summarized"), eventId, summary: autoRunTrajectorySummarySchema }).strict(),
    z.object({ type: z.literal("auto_run.completed"), eventId, autoRunId: id, runId: id, completedAt: z.string().datetime() }).strict(),
    z.object({
        type: z.literal("auto_run.extended"), eventId, autoRunId: id,
        previousMaxIterations: z.number().int().min(1).max(20),
        maxIterations: z.number().int().min(1).max(20),
        additionalIterations: z.number().int().min(1).max(20),
        extendedAt: z.string().datetime(),
    }).strict(),
    z.object({ type: z.literal("auto_run.paused"), eventId, autoRunId: id, pausedAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("auto_run.failed"), eventId, autoRunId: id, error: z.string().trim().min(1).max(500), failedAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("schedule.created"), eventId, schedule: scheduleSchema }).strict(),
    z.object({ type: z.literal("schedule.updated"), eventId, schedule: scheduleSchema }).strict(),
    z.object({ type: z.literal("schedule.triggered"), eventId, scheduleId: id, triggerKey: id, runId: id, triggeredAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("schedule.trigger_failed"), eventId, scheduleId: id, triggerKey: id, error: z.string().trim().min(1).max(500), failedAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("prompt.version_created"), eventId, promptVersion: promptVersionSchema }).strict(),
    z.object({ type: z.literal("prompt.translation_created"), eventId, promptVersionId: id, language: z.literal("zh-CN"), translation: promptTranslationSchema }).strict(),
    z.object({ type: z.literal("agent.decision_recorded"), eventId, decision: agentDecisionSchema }).strict(),
    z.object({ type: z.literal("prompt.approved"), eventId, promptVersionId: id, locks: promptLocksSchema }).strict(),
    z.object({ type: z.literal("reference.imported"), eventId, reference: referenceAssetSchema }).strict(),
    z.object({ type: z.literal("run.queued"), eventId, run: generationRunSchema }).strict(),
    z.object({ type: z.literal("run.started"), eventId, runId: id, startedAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("run.retry_started"), eventId, runId: id, slotIds: z.array(id).min(1).max(8), startedAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("run.cancelled"), eventId, runId: id, cancelledAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("run.slot_succeeded"), eventId, runId: id, slotId: id, imageId: id }).strict(),
    z.object({ type: z.literal("run.slot_failed"), eventId, runId: id, slotId: id, error: generationErrorSchema }).strict(),
    z.object({ type: z.literal("image.registered"), eventId, image: imageAssetSchema }).strict(),
    z.object({ type: z.literal("run.completed"), eventId, runId: id, status: z.enum(["succeeded", "partially_succeeded", "failed"]), completedAt: z.string().datetime() }).strict(),
    z.object({ type: z.literal("feedback.rating_set"), eventId, imageId: id, rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) }).strict(),
    z.object({ type: z.literal("feedback.comment_set"), eventId, imageId: id, comment: text }).strict(),
    z.object({ type: z.literal("image.soft_deleted"), eventId, imageId: id, reason: softDeleteReasonSchema, note: text.optional() }).strict(),
    z.object({ type: z.literal("image.restored"), eventId, imageId: id }).strict(),
    z.object({ type: z.literal("image.permanently_deleted"), eventId, imageId: id }).strict(),
    z.object({
        type: z.literal("preference.feature_reviewed"),
        eventId,
        imageId: id,
        featureId: id,
        decision: z.enum(["confirm", "edit", "ignore", "lock"]),
        value: text.optional(),
    }).strict(),
]);

export const frameFlowTransactionSchema = z.object({
    schemaVersion: z.literal(1),
    sequence: z.number().int().positive(),
    transactionId: z.string().uuid(),
    idempotencyKey: id,
    occurredAt: z.string().datetime(),
    actor: z.object({ type: z.enum(["user", "agent", "system"]), id: id.optional() }).strict(),
    events: z.array(feedbackEventSchema).min(1),
}).strict();

export const frameFlowManifestSchema = z.object({ schemaVersion: z.literal(1), projectionVersion: z.literal(1) }).strict();
