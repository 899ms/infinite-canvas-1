import crypto from "node:crypto";

import { FrameFlowAssetStore, FrameFlowAssetValidationError } from "./asset-store.js";
import { AutoRunCommandError, autoRunCommandEvents, type AutoRunTransitionCommand } from "./auto-run-command-events.js";
import { AutoRunConfigurationError, autoRunConfigurationEvents, type AutoRunConfigurationCommand } from "./auto-run-configuration-events.js";
import { autoRunFailureTransaction } from "./auto-run-failure-transaction.js";
import { AutoRunIterationEventError, autoRunIterationEvents } from "./auto-run-iteration-events.js";
import { autoRunTrajectory } from "./auto-run-trajectory.js";
import { archiveBriefEvent, createBriefEvent, restoreBriefEvent, reviseBriefEvents } from "./brief-lifecycle-events.js";
import { FrameFlowEventStore } from "./event-store.js";
import { FeedbackCommandError, feedbackCommandEvents, type FeedbackCommand } from "./feedback-command-events.js";
import { GenerationCommandError, generationCommandEvents, type GenerationCommand } from "./generation-command-events.js";
import { generationCropPosition } from "./generation-plan.js";
import { queueGenerationRun } from "./generation-run-events.js";
import { executeImageGeneration } from "./generation-execution.js";
import { eventHistory } from "./history.js";
import { MachineReviewEventError, machineReviewEvents } from "./machine-review-events.js";
import { executeMachineReview, MachineReviewExecutionError } from "./machine-review-execution.js";
import { plannerPreferenceContext } from "./preference-context.js";
import { PromptApprovalError, promptApprovalEvents } from "./prompt-approval-events.js";
import { promptLineage } from "./prompt-lineage.js";
import { planPromptEvents, PromptPlanningError } from "./prompt-planning.js";
import { PromptTranslationError, promptTranslationEvents } from "./prompt-translation-events.js";
import { promptVersionEvents } from "./prompt-version-events.js";
import { postCommitEffect } from "./post-commit-effect.js";
import { canContinueExploration, currentBriefForRequirement, isBriefActive, requirementState } from "./query-projection.js";
import { resolvePromptReferenceFiles } from "./reference-files.js";
import { applyTransaction, emptyProjection, preferenceDna, type FrameFlowProjection } from "./reducer.js";
import { staleRunRecoveryTransaction } from "./recovery.js";
import { runFinalizationPlan } from "./run-finalization.js";
import { persistFrameFlowTransaction } from "./transaction-persistence.js";
import { transactionResult } from "./transaction-result.js";
import { frameFlowCommandSchema, frameFlowQuerySchema, promptPlanSchema, referenceImportInputSchema } from "./schemas.js";
import { TrajectorySummaryEventError, trajectorySummaryEvent } from "./trajectory-summary-events.js";
import { TrajectorySummaryPlanError, trajectorySummaryPlan } from "./trajectory-summary-plan.js";
import type {
    AutoRun,
    AutoRunListResult,
    AutoRunTrajectoryResult,
    AutoRunTrajectorySummary,
    BriefListResult,
    BriefDetailResult,
    CreativeBrief,
    EventHistoryResult,
    FrameFlowEvent,
    FrameFlowCommand,
    FrameFlowCommandResult,
    FrameFlowQuery,
    FrameFlowQueryResult,
    FrameFlowPromptPlanner,
    FrameFlowPreferenceContext,
    FrameFlowImageGenerator,
    FrameFlowImageReviewer,
    FrameFlowTrajectorySummarizer,
    FrameFlowImageAsset,
    FrameFlowReferenceAsset,
    FrameFlowReferenceImportInput,
    FrameFlowTransaction,
    GenerationError,
    PreferenceDnaResult,
    PromptLineageResult,
    PromptVersion,
    QuarantineListResult,
    ReferenceListResult,
    ReviewQueueResult,
    RunListResult,
    RunDetailResult,
    ImageDetailResult,
    MachineReview,
    WorkspaceSummaryResult,
} from "./types.js";

export class FrameFlowDomainError extends Error {
    override name = "FrameFlowDomainError";
    constructor(message: string, readonly statusCode: 400 | 404 | 409 | 500) {
        super(message);
    }
}

export class FrameFlowCore {
    private readonly store: FrameFlowEventStore;
    private readonly assets: FrameFlowAssetStore;
    private readonly ready: Promise<void>;
    private writeQueue: Promise<unknown> = Promise.resolve();
    private projection: FrameFlowProjection = emptyProjection();
    private transactions: FrameFlowTransaction[] = [];
    private readonly transactionsByKey = new Map<string, FrameFlowTransaction>();
    private readonly planner?: FrameFlowPromptPlanner;
    private readonly imageGenerator?: FrameFlowImageGenerator;
    private readonly imageReviewer?: FrameFlowImageReviewer;
    private readonly trajectorySummarizer?: FrameFlowTrajectorySummarizer;
    private readonly activePlannings = new Set<string>();
    private readonly activeRuns = new Map<string, AbortController>();
    private readonly activeReviews = new Set<string>();
    private readonly activeSummaries = new Map<string, Promise<AutoRunTrajectorySummary>>();

    constructor(workspacePath: string, options: { planner?: FrameFlowPromptPlanner; imageGenerator?: FrameFlowImageGenerator; imageReviewer?: FrameFlowImageReviewer; trajectorySummarizer?: FrameFlowTrajectorySummarizer } = {}) {
        this.store = new FrameFlowEventStore(workspacePath);
        this.assets = new FrameFlowAssetStore(this.store.directory);
        this.planner = options.planner;
        this.imageGenerator = options.imageGenerator;
        this.imageReviewer = options.imageReviewer;
        this.trajectorySummarizer = options.trajectorySummarizer;
        this.ready = this.initialize();
        void this.ready.then(() => {
            for (const autoRun of Object.values(this.projection.autoRuns)) {
                const requirement = requirementState(this.projection, autoRun.briefId);
                if (requirement.requirementArchived || requirement.briefSuperseded) continue;
                if (autoRun.state === "reviewing" && autoRun.currentRunId) this.launchMachineReview(autoRun.id, autoRun.currentRunId);
                if (autoRun.state === "generating" && !autoRun.currentRunId) this.launchAutoRunPlanning(autoRun.id);
            }
        }).catch(() => undefined);
    }

    execute(command: FrameFlowCommand): Promise<FrameFlowCommandResult> {
        const result = this.writeQueue.catch(() => undefined).then(async () => {
            await this.ready;
            const parsed = frameFlowCommandSchema.parse(command) as FrameFlowCommand;
            const existing = this.transactionsByKey.get(parsed.idempotencyKey);
            if (existing) return transactionResult(existing);

            const occurredAt = new Date().toISOString();
            const events = await this.commandEvents(parsed, occurredAt);
            const transaction: FrameFlowTransaction = {
                schemaVersion: 1,
                sequence: this.projection.sequence + 1,
                transactionId: crypto.randomUUID(),
                idempotencyKey: parsed.idempotencyKey,
                occurredAt,
                actor: { type: parsed.type === "round.plan" || parsed.type === "prompt.translate" || parsed.type === "run.start" || parsed.type === "run.retry" || parsed.type === "auto_run.advance" ? "agent" : "user" },
                events,
            };
            await this.persist(transaction, () => this.assets.quarantineImported(events.flatMap((event) => event.type === "image.registered" ? [event.image] : []), "journal_append_failed"));
            this.afterCommit(parsed, transaction);
            return transactionResult(transaction);
        });
        this.writeQueue = result.catch(() => undefined);
        return result;
    }

    importReference(input: FrameFlowReferenceImportInput, data: Buffer): Promise<FrameFlowReferenceAsset> {
        const result = this.writeQueue.catch(() => undefined).then(async () => {
            await this.ready;
            const parsed = referenceImportInputSchema.parse(input) as FrameFlowReferenceImportInput;
            const existing = this.transactionsByKey.get(parsed.idempotencyKey);
            if (existing) {
                const imported = existing.events.find((event) => event.type === "reference.imported");
                if (!imported || imported.type !== "reference.imported") throw new FrameFlowDomainError("幂等键已被其他 FrameFlow 操作使用", 409);
                return structuredClone(imported.reference);
            }
            const occurredAt = new Date().toISOString();
            let reference: FrameFlowReferenceAsset;
            try {
                reference = await this.assets.importReference(data, { sourceId: parsed.sourceId, sourceName: parsed.sourceName, createdAt: occurredAt });
            } catch (error) {
                if (error instanceof FrameFlowAssetValidationError) throw new FrameFlowDomainError(error.message, 400);
                throw error;
            }
            const transaction: FrameFlowTransaction = {
                schemaVersion: 1,
                sequence: this.projection.sequence + 1,
                transactionId: crypto.randomUUID(),
                idempotencyKey: parsed.idempotencyKey,
                occurredAt,
                actor: { type: "user" },
                events: [{ type: "reference.imported", eventId: crypto.randomUUID(), reference }],
            };
            await this.persist(transaction, () => this.assets.quarantineReferences([reference], "journal_append_failed"));
            return structuredClone(reference);
        });
        this.writeQueue = result.catch(() => undefined);
        return result;
    }

    async triggerAutoRun(autoRunId: string, action: "start" | "advance") {
        try {
            return await this.execute({ type: action === "start" ? "auto_run.start" : "auto_run.advance", autoRunId, idempotencyKey: `auto-run:${action}:${autoRunId}:${crypto.randomUUID()}` });
        } catch (error) {
            const message = error instanceof FrameFlowDomainError ? error.message : "自动跑执行失败，请检查 Agent 日志后重试";
            if (!(error instanceof FrameFlowDomainError) || error.statusCode === 500) await this.recordAutoRunFailure(autoRunId, message);
            throw error;
        }
    }

    summarizeAutoRunTrajectory(autoRunId: string, force = false): Promise<AutoRunTrajectorySummary> {
        const active = this.activeSummaries.get(autoRunId);
        if (active) return active;
        const task = this.createAutoRunTrajectorySummary(autoRunId, force).finally(() => this.activeSummaries.delete(autoRunId));
        this.activeSummaries.set(autoRunId, task);
        return task;
    }

    async query(query: { type: "preference.dna"; briefId: string }): Promise<PreferenceDnaResult>;
    async query(query: { type: "workspace.summary" }): Promise<WorkspaceSummaryResult>;
    async query(query: { type: "brief.list"; limit: number; includeArchived?: boolean }): Promise<BriefListResult>;
    async query(query: { type: "brief.detail"; briefId: string }): Promise<BriefDetailResult>;
    async query(query: { type: "auto_run.list"; limit: number; includeArchived?: boolean }): Promise<AutoRunListResult>;
    async query(query: { type: "auto_run.trajectory"; autoRunId: string }): Promise<AutoRunTrajectoryResult>;
    async query(query: { type: "run.list"; limit: number; includeArchived?: boolean }): Promise<RunListResult>;
    async query(query: { type: "review.queue"; limit: number; includeArchived?: boolean }): Promise<ReviewQueueResult>;
    async query(query: { type: "prompt.lineage"; promptVersionId: string }): Promise<PromptLineageResult>;
    async query(query: { type: "run.detail"; runId: string }): Promise<RunDetailResult>;
    async query(query: { type: "reference.list"; limit: number }): Promise<ReferenceListResult>;
    async query(query: { type: "quarantine.list"; limit: number }): Promise<QuarantineListResult>;
    async query(query: { type: "image.detail"; imageId: string }): Promise<ImageDetailResult>;
    async query(query: { type: "event.history"; subjectId: string; cursor?: string; limit: number }): Promise<EventHistoryResult>;
    async query(query: FrameFlowQuery): Promise<FrameFlowQueryResult>;
    async query(query: FrameFlowQuery): Promise<FrameFlowQueryResult> {
        await this.writeQueue.catch(() => undefined);
        await this.ready;
        const parsed = frameFlowQuerySchema.parse(query) as FrameFlowQuery;
        if (parsed.type === "preference.dna") {
            if (!this.projection.briefs[parsed.briefId]) throw new FrameFlowDomainError("找不到 Creative Brief", 404);
            return structuredClone(preferenceDna(this.projection, parsed.briefId));
        }
        if (parsed.type === "brief.list") return {
            type: "brief.list",
            briefs: structuredClone(Object.values(this.projection.briefs).filter((brief) => parsed.includeArchived || isBriefActive(brief)).slice(-parsed.limit).reverse()),
        };
        if (parsed.type === "brief.detail") {
            const brief = this.projection.briefs[parsed.briefId];
            if (!brief) throw new FrameFlowDomainError("找不到 Creative Brief", 404);
            return { type: "brief.detail", brief: structuredClone(brief) };
        }
        if (parsed.type === "auto_run.list") return {
            type: "auto_run.list",
            autoRuns: Object.values(this.projection.autoRuns).map((autoRun) => ({
                ...structuredClone(autoRun),
                ...requirementState(this.projection, autoRun.briefId),
                canContinueExploration: canContinueExploration(this.projection, autoRun),
            })).filter((autoRun) => parsed.includeArchived || !autoRun.requirementArchived).slice(-parsed.limit).reverse(),
        };
        if (parsed.type === "auto_run.trajectory") return autoRunTrajectory(this.projection, this.transactions, parsed.autoRunId, (message, statusCode) => new FrameFlowDomainError(message, statusCode));
        if (parsed.type === "run.list") return {
            type: "run.list",
            runs: Object.values(this.projection.runs).map((run) => ({
                ...structuredClone(run),
                ...requirementState(this.projection, run.briefId),
            })).filter((run) => parsed.includeArchived || !run.requirementArchived).slice(-parsed.limit).reverse(),
        };
        if (parsed.type === "review.queue") return {
            type: "review.queue",
            items: Object.values(this.projection.images).filter((image) => image.status !== "permanently_deleted").map((image) => {
                const feedback = this.projection.feedbackByImage[image.id];
                const briefId = this.projection.runs[image.runId]?.briefId ?? this.projection.prompts[image.promptVersionId]?.briefId ?? "";
                return {
                    briefId,
                    ...requirementState(this.projection, briefId),
                    image: structuredClone(image),
                    feedback: {
                        ...(feedback?.rating ? { rating: feedback.rating } : {}),
                        ...(feedback?.comment !== undefined ? { comment: feedback.comment } : {}),
                        ...(feedback?.hidden ? { hiddenReason: feedback.hidden.reason } : {}),
                    },
                    ...(this.projection.machineReviewsByImage[image.id] ? { machineReview: structuredClone(this.projection.machineReviewsByImage[image.id]) } : {}),
                };
            }).filter((item) => parsed.includeArchived || !item.requirementArchived).slice(-parsed.limit).reverse(),
        };
        if (parsed.type === "prompt.lineage") return promptLineage(this.projection, parsed.promptVersionId, () => new FrameFlowDomainError("找不到 Prompt Version", 404));
        if (parsed.type === "run.detail") {
            const run = this.projection.runs[parsed.runId];
            if (!run) throw new FrameFlowDomainError("找不到 Generation Run", 404);
            const slots = run.slotIds.map((slotId) => this.projection.slots[slotId]).filter((slot) => Boolean(slot));
            return { type: "run.detail", run: structuredClone(run), slots: structuredClone(slots) };
        }
        if (parsed.type === "reference.list") return { type: "reference.list", items: structuredClone(Object.values(this.projection.references).slice(-parsed.limit).reverse()) };
        if (parsed.type === "quarantine.list") return { type: "quarantine.list", items: await this.assets.listQuarantine(parsed.limit) };
        if (parsed.type === "image.detail") {
            const image = this.projection.images[parsed.imageId];
            if (!image) throw new FrameFlowDomainError("找不到 Image Asset", 404);
            return { type: "image.detail", image: structuredClone(image) };
        }
        if (parsed.type === "workspace.summary") {
            const qualityRejections = Object.values(this.projection.feedbackByImage).filter((feedback) => feedback.hidden && feedback.hidden.reason !== "aesthetic_dislike").length;
            return {
                type: "workspace.summary",
                sequence: this.projection.sequence,
                feedbackImages: Object.keys(this.projection.feedbackByImage).length,
                qualityRejections,
                briefs: Object.keys(this.projection.briefs).length,
                prompts: Object.keys(this.projection.prompts).length,
                runs: Object.keys(this.projection.runs).length,
                images: Object.keys(this.projection.images).length,
                decisions: Object.keys(this.projection.decisions).length,
            };
        }
        return eventHistory(this.transactions, this.projection, parsed);
    }

    async readImageContent(imageId: string) {
        await this.writeQueue.catch(() => undefined);
        await this.ready;
        const image = this.projection.images[imageId];
        if (!image) throw new FrameFlowDomainError("找不到 Image Asset", 404);
        return await this.assets.read(image);
    }

    async readReferenceContent(referenceId: string) {
        await this.writeQueue.catch(() => undefined);
        await this.ready;
        const reference = this.projection.references[referenceId];
        if (!reference) throw new FrameFlowDomainError("找不到 Reference Asset", 404);
        return await this.assets.readReference(reference);
    }

    private async commandEvents(command: FrameFlowCommand, occurredAt: string): Promise<FrameFlowEvent[]> {
        const eventId = crypto.randomUUID();
        if (command.type === "brief.create") {
            for (const referenceId of command.input.referenceImageIds) {
                if (!this.projection.references[referenceId] && !this.projection.images[referenceId]) throw new FrameFlowDomainError(`参考图尚未登记到 FrameFlow：${referenceId}`, 409);
            }
            return createBriefEvent({ input: command.input, briefId: crypto.randomUUID(), eventId, occurredAt });
        }
        if (command.type === "brief.revise") {
            const source = this.requireActiveBrief(command.briefId);
            this.assertRequirementIsNotRunning(source);
            const sourceAutoRun = command.sourceAutoRunId ? this.projection.autoRuns[command.sourceAutoRunId] : undefined;
            if (command.sourceAutoRunId && !sourceAutoRun) throw new FrameFlowDomainError("找不到要延续的自动跑", 404);
            if (sourceAutoRun?.briefId !== source.id) throw new FrameFlowDomainError("要延续的自动跑不属于当前需求", 409);
            for (const referenceId of command.input.referenceImageIds) {
                if (!this.projection.references[referenceId] && !this.projection.images[referenceId]) throw new FrameFlowDomainError(`参考图尚未登记到 FrameFlow：${referenceId}`, 409);
            }
            const briefId = crypto.randomUUID();
            return reviseBriefEvents({ source, input: command.input, ...(sourceAutoRun ? { sourceAutoRun, autoRunId: crypto.randomUUID(), autoRunEventId: crypto.randomUUID() } : {}), briefId, eventId, occurredAt });
        }
        if (command.type === "brief.archive") {
            const requested = this.projection.briefs[command.briefId];
            if (!requested) throw new FrameFlowDomainError("找不到 Creative Brief", 404);
            const brief = currentBriefForRequirement(this.projection, requested);
            if (brief.archivedAt) throw new FrameFlowDomainError("该 Requirement 已归档", 409);
            this.assertRequirementIsNotRunning(brief);
            return archiveBriefEvent({ brief, eventId, occurredAt });
        }
        if (command.type === "brief.restore") {
            const requested = this.projection.briefs[command.briefId];
            if (!requested) throw new FrameFlowDomainError("找不到 Creative Brief", 404);
            const brief = currentBriefForRequirement(this.projection, requested);
            if (!brief.archivedAt) throw new FrameFlowDomainError("该 Requirement 未归档", 409);
            return restoreBriefEvent({ brief, eventId, occurredAt });
        }
        if (command.type === "auto_run.create") {
            this.requireActiveBrief(command.input.briefId, "找不到自动跑对应的方向");
            return this.autoRunConfigurationEvents(command, undefined, occurredAt, eventId);
        }
        if (command.type === "auto_run.update") {
            const autoRun = this.projection.autoRuns[command.autoRunId];
            if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            return this.autoRunConfigurationEvents(command, autoRun, occurredAt, eventId);
        }
        if (command.type === "auto_run.stop") {
            const autoRun = this.projection.autoRuns[command.autoRunId];
            if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
            return this.autoRunTransitionEvents(command, autoRun, occurredAt, eventId);
        }
        if (command.type === "auto_run.start") {
            const autoRun = this.projection.autoRuns[command.autoRunId];
            if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            return this.autoRunTransitionEvents(command, autoRun, occurredAt, eventId);
        }
        if (command.type === "auto_run.extend") {
            const autoRun = this.projection.autoRuns[command.autoRunId];
            if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            return this.autoRunTransitionEvents(command, autoRun, occurredAt, eventId);
        }
        if (command.type === "auto_run.advance") {
            const autoRun = this.projection.autoRuns[command.autoRunId];
            if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            return this.autoRunTransitionEvents(command, autoRun, occurredAt, eventId);
        }
        if (command.type === "round.plan") {
            const brief = this.requireActiveBrief(command.briefId);
            return this.planRoundEvents(brief, command.strategy, occurredAt, eventId);
        }
        if (command.type === "prompt.translate") {
            const prompt = this.projection.prompts[command.promptVersionId];
            if (!prompt) throw new FrameFlowDomainError("找不到 Prompt Version", 404);
            this.requireActiveBrief(prompt.briefId);
            return await this.promptTranslationEvents(prompt, command.language, eventId);
        }
        if (command.type === "prompt.approve") {
            const prompt = this.projection.prompts[command.promptVersionId];
            if (!prompt) throw new FrameFlowDomainError("找不到 Prompt Version", 404);
            this.requireActiveBrief(prompt.briefId);
            return this.promptApprovalEvents(prompt, command.locks, eventId);
        }
        if (command.type === "run.start") {
            const prompt = this.projection.prompts[command.promptVersionId];
            if (!prompt) throw new FrameFlowDomainError("找不到 Prompt Version", 404);
            this.requireActiveBrief(prompt.briefId);
            return this.generationCommandEvents(command, occurredAt, eventId, { prompt });
        }
        if (command.type === "run.retry") {
            const run = this.projection.runs[command.runId];
            if (!run) throw new FrameFlowDomainError("找不到 Generation Run", 404);
            this.requireActiveBrief(run.briefId);
            return this.generationCommandEvents(command, occurredAt, eventId, { run, prompt: this.projection.prompts[run.promptVersionId] });
        }
        if (command.type === "run.cancel") {
            const run = this.projection.runs[command.runId];
            if (!run) throw new FrameFlowDomainError("找不到 Generation Run", 404);
            return this.generationCommandEvents(command, occurredAt, eventId, { run });
        }
        if (command.type === "image.delete") {
            const image = this.projection.images[command.imageId];
            if (!image) throw new FrameFlowDomainError("找不到 Image Asset", 404);
            this.requireImageRequirementActive(image.id);
            return this.feedbackCommandEvents(command, image, eventId);
        }
        const { imageId } = command;
        this.requireImageRequirementActive(imageId);
        return this.feedbackCommandEvents(command, this.projection.images[imageId], eventId);
    }

    private async autoRunIterationEvents(autoRun: AutoRun, occurredAt: string, eventId: string): Promise<FrameFlowEvent[]> {
        if (!this.imageGenerator) throw new FrameFlowDomainError("FrameFlow Codex ImageGen 尚未配置", 409);
        const brief = this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
        const planned = await this.planRoundEvents(brief, brief.strategy, occurredAt, eventId, autoRun.id);
        try {
            return autoRunIterationEvents({ planned, autoRun, occurredAt, createId: crypto.randomUUID });
        } catch (error) {
            if (error instanceof AutoRunIterationEventError) throw new FrameFlowDomainError(error.message, 500);
            throw error;
        }
    }

    private async planRoundEvents(brief: import("./types.js").CreativeBrief, strategy: import("./types.js").CreativeBrief["strategy"], occurredAt: string, eventId: string, autoRunId?: string): Promise<FrameFlowEvent[]> {
        if (!this.planner) throw new FrameFlowDomainError("FrameFlow Codex Planner 尚未配置", 409);
        const preference = this.plannerPreference(brief.id);
        const machineReviews = autoRunId
            ? Object.values(this.projection.machineReviewsByImage).filter((review) => review.autoRunId === autoRunId).slice(-40)
            : [];
        const previous = Object.values(this.projection.prompts).filter((prompt) => prompt.briefId === brief.id).at(-1);
        try {
            return await planPromptEvents({ planner: this.planner, brief, strategy, preference, machineReviews, ...(previous ? { previous } : {}), occurredAt, promptEventId: eventId, createId: crypto.randomUUID });
        } catch (error) {
            if (error instanceof PromptPlanningError) throw new FrameFlowDomainError(error.message, error.statusCode);
            throw error;
        }
    }

    private recordAutoRunFailure(autoRunId: string, message: string): Promise<void> {
        const result = this.writeQueue.catch(() => undefined).then(async () => {
            await this.ready;
            if (!this.projection.autoRuns[autoRunId]) return;
            const failedAt = new Date().toISOString();
            const transaction = autoRunFailureTransaction({ autoRunId, message, sequence: this.projection.sequence, occurredAt: failedAt, createId: crypto.randomUUID });
            await this.persist(transaction);
        });
        this.writeQueue = result.catch(() => undefined);
        return result;
    }

    private referenceFiles(prompt: PromptVersion) {
        return resolvePromptReferenceFiles({
            referenceImageIds: prompt.referenceImageIds,
            references: this.projection.references,
            images: this.projection.images,
            referencePath: (reference) => this.assets.absoluteReferencePath(reference),
            imagePath: (image) => this.assets.absolutePath(image),
            missing: (imageId) => new FrameFlowDomainError(`参考图尚未登记到 FrameFlow：${imageId}`, 409),
        });
    }

    private autoRunTransitionEvents(command: AutoRunTransitionCommand, autoRun: AutoRun, occurredAt: string, eventId: string) {
        const currentRun = autoRun.currentRunId ? this.projection.runs[autoRun.currentRunId] : undefined;
        const otherActiveAutoRun = Object.values(this.projection.autoRuns).find((item) => item.id !== autoRun.id && (item.state === "generating" || item.state === "reviewing"));
        try {
            return autoRunCommandEvents({ command, autoRun, ...(currentRun ? { currentRun } : {}), ...(otherActiveAutoRun ? { otherActiveAutoRun } : {}), imageReviewerConfigured: Boolean(this.imageReviewer), machineReviewsByImage: this.projection.machineReviewsByImage, canContinueExploration: canContinueExploration(this.projection, autoRun), occurredAt, eventId });
        } catch (error) {
            if (error instanceof AutoRunCommandError) throw new FrameFlowDomainError(error.message, error.statusCode);
            throw error;
        }
    }

    private autoRunConfigurationEvents(command: AutoRunConfigurationCommand, autoRun: AutoRun | undefined, occurredAt: string, eventId: string) {
        try {
            return autoRunConfigurationEvents({ command, ...(autoRun ? { autoRun } : {}), eventId, occurredAt, createId: crypto.randomUUID });
        } catch (error) {
            if (error instanceof AutoRunConfigurationError) throw new FrameFlowDomainError(error.message, error.statusCode);
            throw error;
        }
    }

    private generationCommandEvents(command: GenerationCommand, occurredAt: string, eventId: string, input: { prompt?: PromptVersion; run?: import("./types.js").GenerationRun }) {
        try {
            return generationCommandEvents({ command, ...input, imageGeneratorConfigured: Boolean(this.imageGenerator), slots: this.projection.slots, occurredAt, eventId, createId: crypto.randomUUID });
        } catch (error) {
            if (error instanceof GenerationCommandError) throw new FrameFlowDomainError(error.message, error.statusCode);
            throw error;
        }
    }

    private promptApprovalEvents(prompt: PromptVersion, locks: import("./types.js").PromptLocks, eventId: string) {
        try {
            return promptApprovalEvents({ prompt, locks, eventId });
        } catch (error) {
            if (error instanceof PromptApprovalError) throw new FrameFlowDomainError(error.message, error.statusCode);
            throw error;
        }
    }

    private feedbackCommandEvents(command: FeedbackCommand, image: FrameFlowImageAsset | undefined, eventId: string) {
        try {
            return feedbackCommandEvents({ command, ...(image ? { image } : {}), eventId });
        } catch (error) {
            if (error instanceof FeedbackCommandError) throw new FrameFlowDomainError(error.message, error.statusCode);
            throw error;
        }
    }

    private async promptTranslationEvents(prompt: PromptVersion, language: import("./types.js").PromptDisplayLanguage, eventId: string) {
        try {
            return await promptTranslationEvents({ prompt, language, eventId, ...(this.planner?.translate ? { translate: this.planner.translate } : {}) });
        } catch (error) {
            if (error instanceof PromptTranslationError) throw new FrameFlowDomainError(error.message, error.statusCode);
            throw error;
        }
    }

    private assertRequirementIsNotRunning(brief: CreativeBrief) {
        const requirementId = brief.requirementId ?? brief.id;
        const briefIds = new Set(Object.values(this.projection.briefs)
            .filter((item) => (item.requirementId ?? item.id) === requirementId)
            .map((item) => item.id));
        const active = Object.values(this.projection.autoRuns).find((autoRun) => briefIds.has(autoRun.briefId) && (autoRun.state === "generating" || autoRun.state === "reviewing"));
        if (active) throw new FrameFlowDomainError(`请先停止正在运行的“${active.name}”`, 409);
        const activeRun = Object.values(this.projection.runs).find((run) => briefIds.has(run.briefId) && (run.status === "queued" || run.status === "running" || run.status === "retrying"));
        if (activeRun) throw new FrameFlowDomainError(`请先停止正在生成的批次 ${activeRun.id.slice(0, 8)}`, 409);
    }

    private requireRequirementActive(briefId: string) {
        const brief = this.projection.briefs[briefId];
        if (!brief) throw new FrameFlowDomainError("找不到 Creative Brief", 404);
        if (currentBriefForRequirement(this.projection, brief).archivedAt) throw new FrameFlowDomainError("该 Requirement 已归档，历史血缘只读", 409);
        return brief;
    }

    private requireImageRequirementActive(imageId: string) {
        const image = this.projection.images[imageId];
        if (!image) return;
        const briefId = this.projection.runs[image.runId]?.briefId ?? this.projection.prompts[image.promptVersionId]?.briefId;
        if (!briefId) throw new FrameFlowDomainError("Image Asset 缺少 Creative Brief 血缘", 500);
        this.requireRequirementActive(briefId);
    }

    private requirementLifecycleToken(briefId: string) {
        const requirementId = this.projection.briefs[briefId]?.requirementId ?? this.projection.briefs[briefId]?.id ?? briefId;
        return this.transactions.reduce((token, transaction) => transaction.events.some((event) => {
            if (event.type !== "brief.archived" && event.type !== "brief.restored") return false;
            const eventRequirementId = event.requirementId ?? this.projection.briefs[event.briefId]?.requirementId ?? event.briefId;
            return eventRequirementId === requirementId;
        }) ? transaction.sequence : token, 0);
    }

    private assertRequirementLifecycleUnchanged(briefId: string, token: number) {
        if (this.requirementLifecycleToken(briefId) !== token) throw new FrameFlowDomainError("Requirement 生命周期已变更，已丢弃归档前启动的迟到结果", 409);
    }

    private requireActiveBrief(briefId: string, missingMessage = "找不到 Creative Brief") {
        const brief = this.projection.briefs[briefId];
        if (!brief) throw new FrameFlowDomainError(missingMessage, 404);
        this.requireRequirementActive(brief.id);
        if (currentBriefForRequirement(this.projection, brief).id !== brief.id || brief.supersededAt || brief.supersededByBriefId) {
            throw new FrameFlowDomainError("该 Brief 不是当前 Brief 修订，已归档或已被新修订取代", 409);
        }
        return brief;
    }

    private plannerPreference(briefId: string): FrameFlowPreferenceContext {
        return plannerPreferenceContext(this.projection, briefId);
    }

    private afterCommit(command: FrameFlowCommand, transaction: FrameFlowTransaction) {
        const autoRun = command.type === "auto_run.start" || command.type === "auto_run.extend" || command.type === "auto_run.advance" ? this.projection.autoRuns[command.autoRunId] : undefined;
        const effect = postCommitEffect({ command, events: transaction.events, ...(autoRun ? { autoRun } : {}) });
        if (!effect) return;
        if (effect.type === "run.abort") {
            this.activeRuns.get(effect.runId)?.abort();
            return;
        }
        if (effect.type === "machine_review.launch") {
            this.launchMachineReview(effect.autoRunId, effect.runId);
            return;
        }
        if (effect.type === "auto_run_planning.launch") {
            this.launchAutoRunPlanning(effect.autoRunId);
            return;
        }
        const promptVersionId = effect.type === "generation.retry" ? this.projection.runs[effect.runId]?.promptVersionId : effect.promptVersionId;
        const prompt = promptVersionId ? this.projection.prompts[promptVersionId] : undefined;
        const brief = prompt ? this.projection.briefs[prompt.briefId] : undefined;
        if (prompt && brief) this.launchGeneration({ prompt, aspectRatio: brief.aspectRatio, cropPosition: generationCropPosition(prompt), runId: effect.runId, slotIds: effect.slotIds, referenceFiles: this.referenceFiles(prompt) });
    }

    private launchAutoRunPlanning(autoRunId: string) {
        if (this.activePlannings.has(autoRunId)) return;
        const autoRun = this.projection.autoRuns[autoRunId];
        if (!autoRun || autoRun.state !== "generating" || autoRun.currentRunId) return;
        const planningStartedAt = autoRun.updatedAt;
        this.activePlannings.add(autoRunId);
        void this.planAndStartAutoRunIteration(autoRunId, planningStartedAt)
            .catch((error) => this.recordActivePlanningFailure(autoRunId, planningStartedAt, error instanceof Error ? error.message : "Codex 规划失败，请重试"))
            .finally(() => {
                this.activePlannings.delete(autoRunId);
                const current = this.projection.autoRuns[autoRunId];
                if (current?.state === "generating" && !current.currentRunId) this.launchAutoRunPlanning(autoRunId);
            });
    }

    private async planAndStartAutoRunIteration(autoRunId: string, planningStartedAt: string) {
        await this.ready;
        const autoRun = this.projection.autoRuns[autoRunId];
        if (!autoRun || autoRun.state !== "generating" || autoRun.currentRunId || autoRun.updatedAt !== planningStartedAt) return;
        const expectedIteration = autoRun.iteration;
        const occurredAt = new Date().toISOString();
        const events = await this.autoRunIterationEvents(structuredClone(autoRun), occurredAt, crypto.randomUUID());
        const result = this.writeQueue.catch(() => undefined).then(async () => {
            const current = this.projection.autoRuns[autoRunId];
            if (!current || current.state !== "generating" || current.currentRunId || current.iteration !== expectedIteration || current.updatedAt !== planningStartedAt) return;
            const transaction: FrameFlowTransaction = {
                schemaVersion: 1,
                sequence: this.projection.sequence + 1,
                transactionId: crypto.randomUUID(),
                idempotencyKey: `system:auto-run-plan:${autoRunId}:${expectedIteration + 1}:${crypto.randomUUID()}`,
                occurredAt,
                actor: { type: "agent" },
                events,
            };
            await this.persist(transaction);
            const queued = transaction.events.find((event) => event.type === "run.queued");
            if (!queued || queued.type !== "run.queued") return;
            const prompt = this.projection.prompts[queued.run.promptVersionId];
            const brief = prompt ? this.projection.briefs[prompt.briefId] : undefined;
            if (prompt && brief) this.launchGeneration({ prompt, aspectRatio: brief.aspectRatio, cropPosition: generationCropPosition(prompt), runId: queued.run.id, slotIds: queued.run.slotIds, referenceFiles: this.referenceFiles(prompt) });
        });
        this.writeQueue = result.catch(() => undefined);
        await result;
    }

    private async recordActivePlanningFailure(autoRunId: string, planningStartedAt: string, message: string) {
        await this.writeQueue.catch(() => undefined);
        const autoRun = this.projection.autoRuns[autoRunId];
        if (autoRun?.state !== "generating" || autoRun.currentRunId || autoRun.updatedAt !== planningStartedAt) return;
        await this.recordAutoRunFailure(autoRunId, message);
    }

    private launchGeneration(input: {
        prompt: PromptVersion;
        aspectRatio: string;
        cropPosition: "top" | "attention";
        runId: string;
        slotIds: string[];
        referenceFiles: string[];
    }) {
        const controller = new AbortController();
        this.activeRuns.set(input.runId, controller);
        void this.generateAndFinalize({ ...input, controller }).catch(() => undefined).finally(() => {
            if (this.activeRuns.get(input.runId) === controller) this.activeRuns.delete(input.runId);
        });
    }

    private async generateAndFinalize(input: {
        prompt: PromptVersion;
        aspectRatio: string;
        cropPosition: "top" | "attention";
        runId: string;
        slotIds: string[];
        referenceFiles: string[];
        controller: AbortController;
    }) {
        const execution = await executeImageGeneration({
            generator: this.imageGenerator!,
            assets: this.assets,
            prompt: input.prompt,
            aspectRatio: input.aspectRatio,
            cropPosition: input.cropPosition,
            runId: input.runId,
            slotIds: input.slotIds,
            referenceFiles: input.referenceFiles,
            signal: input.controller.signal,
            now: () => new Date().toISOString(),
        });
        if (execution.type === "discarded") return;
        await this.enqueueRunFinalization({ ...input, images: execution.images, ...(execution.error ? { error: execution.error } : {}) });
    }

    private enqueueRunFinalization(input: {
        prompt: PromptVersion;
        runId: string;
        slotIds: string[];
        images: FrameFlowImageAsset[];
        error?: GenerationError;
    }): Promise<void> {
        const result = this.writeQueue.catch(() => undefined).then(async () => {
            await this.ready;
            const run = this.projection.runs[input.runId];
            if (!run || run.status === "cancelled") {
                await this.assets.quarantineImported(input.images, "generation_cancelled");
                return;
            }

            const occurredAt = new Date().toISOString();
            const autoRun = Object.values(this.projection.autoRuns).find((item) => item.currentRunId === input.runId && (item.state === "generating" || item.state === "paused"));
            const finalization = runFinalizationPlan({ run, slots: this.projection.slots, slotIds: input.slotIds, images: input.images, ...(input.error ? { error: input.error } : {}), ...(autoRun ? { autoRun } : {}), occurredAt });
            const transaction: FrameFlowTransaction = {
                schemaVersion: 1,
                sequence: this.projection.sequence + 1,
                transactionId: crypto.randomUUID(),
                idempotencyKey: `system:run-finalize:${input.runId}:${crypto.randomUUID()}`,
                occurredAt,
                actor: { type: "system" },
                events: finalization.events,
            };
            await this.persist(transaction, () => this.assets.quarantineImported(input.images, "journal_append_failed"));
            if (finalization.reviewAutoRunId) this.launchMachineReview(finalization.reviewAutoRunId, input.runId);
        });
        this.writeQueue = result.catch(() => undefined);
        return result;
    }

    private launchMachineReview(autoRunId: string, runId: string) {
        if (!this.imageReviewer || this.activeReviews.has(runId)) return;
        const autoRun = this.projection.autoRuns[autoRunId];
        const lifecycleToken = autoRun ? this.requirementLifecycleToken(autoRun.briefId) : 0;
        this.activeReviews.add(runId);
        void this.reviewAndRecord(autoRunId, runId, lifecycleToken)
            .then((advance) => {
                if (advance) return this.triggerAutoRun(autoRunId, "advance");
                if (this.projection.autoRuns[autoRunId]?.state === "completed") this.launchTrajectorySummary(autoRunId);
                return undefined;
            })
            .catch((error) => this.recordActiveReviewFailure(autoRunId, error instanceof Error ? error.message : "Codex 机器审图失败，请重试"))
            .finally(() => this.activeReviews.delete(runId));
    }

    private async recordActiveReviewFailure(autoRunId: string, message: string) {
        await this.writeQueue.catch(() => undefined);
        if (this.projection.autoRuns[autoRunId]?.state !== "reviewing") return;
        await this.recordAutoRunFailure(autoRunId, message);
    }

    private async reviewAndRecord(autoRunId: string, runId: string, lifecycleToken: number) {
        await this.ready;
        const autoRun = this.projection.autoRuns[autoRunId];
        const run = this.projection.runs[runId];
        const prompt = run ? this.projection.prompts[run.promptVersionId] : undefined;
        const brief = prompt ? this.projection.briefs[prompt.briefId] : undefined;
        if (!autoRun || !run || !prompt || !brief || !run.imageIds.length) throw new FrameFlowDomainError("机器审图缺少本轮图片或血缘", 409);
        this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
        let execution: Awaited<ReturnType<typeof executeMachineReview>>;
        try {
            execution = await executeMachineReview({
                reviewer: this.imageReviewer!,
                brief,
                prompt,
                autoRun,
                run,
                images: this.projection.images,
                reviewedImageIds: new Set(Object.keys(this.projection.machineReviewsByImage)),
                imagePath: (image) => this.assets.absolutePath(image),
            });
        } catch (error) {
            if (error instanceof MachineReviewExecutionError) throw new FrameFlowDomainError(error.message, error.statusCode);
            throw error;
        }
        if (execution.type === "already_reviewed") return autoRun.state === "reviewing" && autoRun.iteration < autoRun.maxIterations;
        const result = this.writeQueue.catch(() => undefined).then(async () => {
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            this.assertRequirementLifecycleUnchanged(brief.id, lifecycleToken);
            const occurredAt = new Date().toISOString();
            const current = this.projection.autoRuns[autoRunId];
            if (!current) return false;
            let events: FrameFlowEvent[];
            try {
                events = machineReviewEvents({
                    reviews: execution.reviews,
                    pendingImageIds: execution.pendingImageIds,
                    existingReviewImageIds: new Set(Object.keys(this.projection.machineReviewsByImage)),
                    autoRun: current,
                    runId,
                    occurredAt,
                    createId: crypto.randomUUID,
                });
            } catch (error) {
                if (error instanceof MachineReviewEventError) throw new FrameFlowDomainError(error.message, 500);
                throw error;
            }
            if (!events.length) return current.state === "reviewing" && current.iteration < current.maxIterations;
            const transaction: FrameFlowTransaction = {
                schemaVersion: 1,
                sequence: this.projection.sequence + 1,
                transactionId: crypto.randomUUID(),
                idempotencyKey: `system:machine-review:${runId}:${crypto.randomUUID()}`,
                occurredAt,
                actor: { type: "agent" },
                events,
            };
            await this.persist(transaction);
            const updated = this.projection.autoRuns[autoRunId];
            return updated?.state === "reviewing" && updated.iteration < updated.maxIterations;
        });
        this.writeQueue = result.catch(() => undefined);
        return await result;
    }

    private launchTrajectorySummary(autoRunId: string) {
        if (!this.trajectorySummarizer) return;
        void this.summarizeAutoRunTrajectory(autoRunId).catch(() => undefined);
    }

    private async createAutoRunTrajectorySummary(autoRunId: string, force: boolean) {
        await this.writeQueue.catch(() => undefined);
        await this.ready;
        if (!this.trajectorySummarizer) throw new FrameFlowDomainError("Codex 跨轮总结尚未启用", 409);
        const autoRun = this.projection.autoRuns[autoRunId];
        if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
        this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
        const lifecycleToken = this.requirementLifecycleToken(autoRun.briefId);
        const trajectory = autoRunTrajectory(this.projection, this.transactions, autoRunId, (message, statusCode) => new FrameFlowDomainError(message, statusCode));
        const existing = this.projection.trajectorySummariesByAutoRun[autoRunId];
        let plan: ReturnType<typeof trajectorySummaryPlan>;
        try {
            plan = trajectorySummaryPlan({ trajectory, ...(existing ? { existing } : {}), force });
        } catch (error) {
            if (error instanceof TrajectorySummaryPlanError) throw new FrameFlowDomainError(error.message, error.statusCode);
            throw error;
        }
        if (plan.type === "cached") return plan.summary;
        const draft = await this.trajectorySummarizer.summarize(plan.input);
        const createdAt = new Date().toISOString();
        let summary: AutoRunTrajectorySummary;
        let event: Extract<FrameFlowEvent, { type: "auto_run.trajectory_summarized" }>;
        try {
            ({ summary, event } = trajectorySummaryEvent({ autoRunId, throughIteration: plan.throughIteration, reviewedIterations: plan.reviewedIterations, createdAt, draft, eventId: crypto.randomUUID() }));
        } catch (error) {
            if (error instanceof TrajectorySummaryEventError) throw new FrameFlowDomainError(error.message, 500);
            throw error;
        }
        const result = this.writeQueue.catch(() => undefined).then(async () => {
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            this.assertRequirementLifecycleUnchanged(autoRun.briefId, lifecycleToken);
            const transaction: FrameFlowTransaction = {
                schemaVersion: 1,
                sequence: this.projection.sequence + 1,
                transactionId: crypto.randomUUID(),
                idempotencyKey: `system:trajectory-summary:${autoRunId}:${plan.throughIteration}:${crypto.randomUUID()}`,
                occurredAt: createdAt,
                actor: { type: "agent" },
                events: [event],
            };
            await this.persist(transaction);
            return structuredClone(summary);
        });
        this.writeQueue = result.catch(() => undefined);
        return await result;
    }

    private async initialize() {
        const transactions = await this.store.load();
        for (const transaction of transactions) this.remember(transaction);
        const recovery = staleRunRecoveryTransaction(this.projection, new Date().toISOString(), () => crypto.randomUUID());
        if (recovery) {
            await this.store.append(recovery);
            this.remember(recovery);
        }
        await Promise.all([
            this.assets.quarantineOrphans(new Set(Object.values(this.projection.images).map((image) => image.file.relativePath))),
            this.assets.quarantineReferenceOrphans(new Set(Object.values(this.projection.references).map((reference) => reference.file.relativePath))),
        ]);
        await this.store.writeProjection(this.projection);
    }

    private persist(transaction: FrameFlowTransaction, onAppendFailure?: () => Promise<unknown>) {
        return persistFrameFlowTransaction({
            transaction,
            append: (item) => this.store.append(item),
            remember: (item) => this.remember(item),
            currentProjection: () => this.projection,
            writeProjection: (projection) => this.store.writeProjection(projection),
            ...(onAppendFailure ? { onAppendFailure } : {}),
        });
    }

    private remember(transaction: FrameFlowTransaction) {
        this.transactions.push(structuredClone(transaction));
        this.transactionsByKey.set(transaction.idempotencyKey, structuredClone(transaction));
        this.projection = applyTransaction(this.projection, transaction);
    }

}
