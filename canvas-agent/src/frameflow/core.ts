import crypto from "node:crypto";

import { FrameFlowAssetStore, FrameFlowAssetValidationError } from "./asset-store.js";
import { FrameFlowEventStore } from "./event-store.js";
import { eventHistory } from "./history.js";
import { buildPromptDiff } from "./prompt-diff.js";
import { applyTransaction, emptyProjection, preferenceDna, type FrameFlowProjection } from "./reducer.js";
import { staleRunRecoveryTransaction } from "./recovery.js";
import { transactionResult } from "./transaction-result.js";
import { autoRunTrajectorySummaryDraftSchema, frameFlowCommandSchema, frameFlowQuerySchema, machineReviewResultSchema, promptPlanSchema, promptTranslationSchema, referenceImportInputSchema } from "./schemas.js";
import { DEFAULT_CREATIVE_BRIEF_PURPOSE } from "./types.js";
import type {
    AgentDecision,
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
    PromptFieldKey,
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
                const requirement = this.requirementState(autoRun.briefId);
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
            try {
                await this.store.append(transaction);
            } catch (error) {
                await this.assets.quarantineImported(events.flatMap((event) => event.type === "image.registered" ? [event.image] : []), "journal_append_failed");
                throw error;
            }
            this.remember(transaction);
            await this.store.writeProjection(this.projection);
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
            try {
                await this.store.append(transaction);
            } catch (error) {
                await this.assets.quarantineReferences([reference], "journal_append_failed");
                throw error;
            }
            this.remember(transaction);
            await this.store.writeProjection(this.projection);
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
            briefs: structuredClone(Object.values(this.projection.briefs).filter((brief) => parsed.includeArchived || this.isBriefActive(brief)).slice(-parsed.limit).reverse()),
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
                ...this.requirementState(autoRun.briefId),
                canContinueExploration: this.canContinueExploration(autoRun),
            })).filter((autoRun) => parsed.includeArchived || !autoRun.requirementArchived).slice(-parsed.limit).reverse(),
        };
        if (parsed.type === "auto_run.trajectory") return this.autoRunTrajectory(parsed.autoRunId);
        if (parsed.type === "run.list") return {
            type: "run.list",
            runs: Object.values(this.projection.runs).map((run) => ({
                ...structuredClone(run),
                ...this.requirementState(run.briefId),
            })).filter((run) => parsed.includeArchived || !run.requirementArchived).slice(-parsed.limit).reverse(),
        };
        if (parsed.type === "review.queue") return {
            type: "review.queue",
            items: Object.values(this.projection.images).filter((image) => image.status !== "permanently_deleted").map((image) => {
                const feedback = this.projection.feedbackByImage[image.id];
                const briefId = this.projection.runs[image.runId]?.briefId ?? this.projection.prompts[image.promptVersionId]?.briefId ?? "";
                return {
                    briefId,
                    ...this.requirementState(briefId),
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
        if (parsed.type === "prompt.lineage") return this.promptLineage(parsed.promptVersionId);
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
            const briefId = crypto.randomUUID();
            return [{ type: "brief.created", eventId, brief: { id: briefId, requirementId: briefId, revision: 1, ...command.input, purpose: command.input.purpose?.trim() || DEFAULT_CREATIVE_BRIEF_PURPOSE, profileId: briefId, createdAt: occurredAt } }];
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
            const revision = (source.revision ?? 1) + 1;
            const events: FrameFlowEvent[] = [{
                type: "brief.revised",
                eventId,
                sourceBriefId: source.id,
                supersededAt: occurredAt,
                brief: {
                    id: briefId,
                    requirementId: source.requirementId ?? source.id,
                    revision,
                    supersedesBriefId: source.id,
                    ...command.input,
                    purpose: command.input.purpose?.trim() || DEFAULT_CREATIVE_BRIEF_PURPOSE,
                    profileId: briefId,
                    createdAt: occurredAt,
                },
            }];
            if (sourceAutoRun) {
                events.push({
                    type: "auto_run.created",
                    eventId: crypto.randomUUID(),
                    autoRun: {
                        id: crypto.randomUUID(),
                        name: `${sourceAutoRun.name} · 修订 ${revision}`.slice(0, 500),
                        briefId,
                        count: sourceAutoRun.count,
                        maxIterations: sourceAutoRun.maxIterations,
                        state: "paused",
                        iteration: 0,
                        createdAt: occurredAt,
                        updatedAt: occurredAt,
                    },
                });
            }
            return events;
        }
        if (command.type === "brief.archive") {
            const requested = this.projection.briefs[command.briefId];
            if (!requested) throw new FrameFlowDomainError("找不到 Creative Brief", 404);
            const brief = this.currentBriefForRequirement(requested);
            if (brief.archivedAt) throw new FrameFlowDomainError("该 Requirement 已归档", 409);
            this.assertRequirementIsNotRunning(brief);
            return [{ type: "brief.archived", eventId, briefId: brief.id, requirementId: brief.requirementId ?? brief.id, archivedAt: occurredAt }];
        }
        if (command.type === "brief.restore") {
            const requested = this.projection.briefs[command.briefId];
            if (!requested) throw new FrameFlowDomainError("找不到 Creative Brief", 404);
            const brief = this.currentBriefForRequirement(requested);
            if (!brief.archivedAt) throw new FrameFlowDomainError("该 Requirement 未归档", 409);
            return [{ type: "brief.restored", eventId, briefId: brief.id, requirementId: brief.requirementId ?? brief.id, restoredAt: occurredAt }];
        }
        if (command.type === "auto_run.create") {
            this.requireActiveBrief(command.input.briefId, "找不到自动跑对应的方向");
            const autoRun: AutoRun = { id: crypto.randomUUID(), ...command.input, state: "paused", iteration: 0, createdAt: occurredAt, updatedAt: occurredAt };
            return [{ type: "auto_run.created", eventId, autoRun }];
        }
        if (command.type === "auto_run.update") {
            const autoRun = this.projection.autoRuns[command.autoRunId];
            if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            if (autoRun.state === "generating" || autoRun.state === "reviewing") throw new FrameFlowDomainError("请先停止自动跑，再修改名称、每轮数量或最大轮数", 409);
            return [{ type: "auto_run.updated", eventId, autoRun: { ...structuredClone(autoRun), ...command.input, updatedAt: occurredAt } }];
        }
        if (command.type === "auto_run.stop") {
            const autoRun = this.projection.autoRuns[command.autoRunId];
            if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
            if (autoRun.state !== "generating" && autoRun.state !== "reviewing") throw new FrameFlowDomainError("只有正在生成或机器审图的自动跑可以停止", 409);
            return [{ type: "auto_run.paused", eventId, autoRunId: autoRun.id, pausedAt: occurredAt, reason: "user_requested" }];
        }
        if (command.type === "auto_run.start") {
            const autoRun = this.projection.autoRuns[command.autoRunId];
            if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            if (!this.imageReviewer) throw new FrameFlowDomainError("FrameFlow Codex 机器审图尚未配置", 409);
            if (autoRun.state === "generating" || autoRun.state === "reviewing") throw new FrameFlowDomainError("自动跑已经启动", 409);
            const otherActive = Object.values(this.projection.autoRuns).find((item) => item.id !== autoRun.id && (item.state === "generating" || item.state === "reviewing"));
            if (otherActive) throw new FrameFlowDomainError(`请先停止正在运行的“${otherActive.name}”`, 409);
            const currentRun = autoRun.currentRunId ? this.projection.runs[autoRun.currentRunId] : undefined;
            if (currentRun && (currentRun.status === "queued" || currentRun.status === "running" || currentRun.status === "retrying")) {
                return [{ type: "auto_run.updated", eventId, autoRun: { ...structuredClone(autoRun), state: "generating", updatedAt: occurredAt } }];
            }
            if (currentRun?.imageIds.length) {
                const missingReview = currentRun.imageIds.some((imageId) => !this.projection.machineReviewsByImage[imageId]);
                if (missingReview) return [{ type: "auto_run.review_started", eventId, autoRunId: autoRun.id, runId: currentRun.id, startedAt: occurredAt }];
                if (autoRun.iteration >= autoRun.maxIterations) return [{ type: "auto_run.completed", eventId, autoRunId: autoRun.id, runId: currentRun.id, completedAt: occurredAt }];
            }
            return [{ type: "auto_run.updated", eventId, autoRun: planningAutoRun(autoRun, occurredAt) }];
        }
        if (command.type === "auto_run.extend") {
            const autoRun = this.projection.autoRuns[command.autoRunId];
            if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            if (autoRun.state !== "completed") throw new FrameFlowDomainError("只有已完成的自动跑可以继续探索", 409);
            if (!this.canContinueExploration(autoRun)) throw new FrameFlowDomainError("最后一轮没有可继续探索的 vary 机器审图，或已达到 20 轮上限", 409);
            const maxIterations = autoRun.maxIterations + command.additionalIterations;
            if (maxIterations > 20) throw new FrameFlowDomainError("自动跑最多可累计 20 轮", 409);
            const otherActive = Object.values(this.projection.autoRuns).find((item) => item.id !== autoRun.id && (item.state === "generating" || item.state === "reviewing"));
            if (otherActive) throw new FrameFlowDomainError(`请先停止正在运行的“${otherActive.name}”`, 409);
            return [{
                type: "auto_run.extended", eventId, autoRunId: autoRun.id,
                previousMaxIterations: autoRun.maxIterations,
                maxIterations,
                additionalIterations: command.additionalIterations,
                extendedAt: occurredAt,
            }];
        }
        if (command.type === "auto_run.advance") {
            const autoRun = this.projection.autoRuns[command.autoRunId];
            if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            if (autoRun.state !== "reviewing" || !autoRun.currentRunId) throw new FrameFlowDomainError("当前没有正在自动审图的轮次", 409);
            const run = this.projection.runs[autoRun.currentRunId];
            if (!run?.imageIds.length || run.imageIds.some((imageId) => !this.projection.machineReviewsByImage[imageId])) throw new FrameFlowDomainError("Codex 尚未完成本轮机器审图", 409);
            if (autoRun.iteration >= autoRun.maxIterations) return [{ type: "auto_run.completed", eventId, autoRunId: autoRun.id, runId: run.id, completedAt: occurredAt }];
            return [{ type: "auto_run.updated", eventId, autoRun: planningAutoRun(autoRun, occurredAt) }];
        }
        if (command.type === "round.plan") {
            const brief = this.requireActiveBrief(command.briefId);
            return this.planRoundEvents(brief, command.strategy, occurredAt, eventId);
        }
        if (command.type === "prompt.translate") {
            const prompt = this.projection.prompts[command.promptVersionId];
            if (!prompt) throw new FrameFlowDomainError("找不到 Prompt Version", 404);
            this.requireActiveBrief(prompt.briefId);
            const existing = prompt.translations?.[command.language];
            if (existing) return [{ type: "prompt.translation_created", eventId, promptVersionId: prompt.id, language: command.language, translation: structuredClone(existing) }];
            if (!this.planner?.translate) throw new FrameFlowDomainError("FrameFlow Codex 中文翻译尚未配置", 409);
            const translation = promptTranslationSchema.parse(await this.planner.translate({ prompt: structuredClone(prompt), language: command.language }));
            return [{ type: "prompt.translation_created", eventId, promptVersionId: prompt.id, language: command.language, translation }];
        }
        if (command.type === "prompt.approve") {
            const prompt = this.projection.prompts[command.promptVersionId];
            if (!prompt) throw new FrameFlowDomainError("找不到 Prompt Version", 404);
            this.requireActiveBrief(prompt.briefId);
            if (prompt.status !== "draft") throw new FrameFlowDomainError("只有 draft Prompt 可以批准", 409);
            for (const [field, values] of Object.entries(command.locks)) {
                if (values?.some((value) => !prompt.fields[field as keyof typeof prompt.fields].includes(value))) throw new FrameFlowDomainError(`锁定项不属于 Prompt 字段：${field}`, 409);
            }
            return [{ type: "prompt.approved", eventId, promptVersionId: prompt.id, locks: structuredClone(command.locks) }];
        }
        if (command.type === "run.start") {
            const prompt = this.projection.prompts[command.promptVersionId];
            if (!prompt) throw new FrameFlowDomainError("找不到 Prompt Version", 404);
            this.requireActiveBrief(prompt.briefId);
            if (prompt.status !== "approved" && prompt.status !== "used") throw new FrameFlowDomainError("只有已批准 Prompt 才能开始生成", 409);
            if (!this.imageGenerator) throw new FrameFlowDomainError("FrameFlow Codex ImageGen 尚未配置", 409);
            const runId = crypto.randomUUID();
            const slotIds = Array.from({ length: command.count }, () => crypto.randomUUID());
            return [
                { type: "run.queued", eventId, run: { id: runId, briefId: prompt.briefId, promptVersionId: prompt.id, status: "queued", requestedCount: command.count, slotIds, imageIds: [], createdAt: occurredAt } },
                { type: "run.started", eventId: crypto.randomUUID(), runId, startedAt: occurredAt },
            ];
        }
        if (command.type === "run.retry") {
            const run = this.projection.runs[command.runId];
            if (!run) throw new FrameFlowDomainError("找不到 Generation Run", 404);
            this.requireActiveBrief(run.briefId);
            if (!this.imageGenerator) throw new FrameFlowDomainError("FrameFlow Codex ImageGen 尚未配置", 409);
            if (new Set(command.failedSlotIds).size !== command.failedSlotIds.length) throw new FrameFlowDomainError("失败 slot 不可重复", 409);
            for (const slotId of command.failedSlotIds) {
                const slot = this.projection.slots[slotId];
                if (!slot || slot.runId !== run.id) throw new FrameFlowDomainError(`slot 不属于该 Run：${slotId}`, 409);
                if (slot.status !== "failed") throw new FrameFlowDomainError(`只有失败 slot 可以重试：${slotId}`, 409);
            }
            if (!this.projection.prompts[run.promptVersionId]) throw new FrameFlowDomainError("找不到 Run 对应的 Prompt Version", 404);
            return [{ type: "run.retry_started", eventId, runId: run.id, slotIds: [...command.failedSlotIds], startedAt: occurredAt }];
        }
        if (command.type === "run.cancel") {
            const run = this.projection.runs[command.runId];
            if (!run) throw new FrameFlowDomainError("找不到 Generation Run", 404);
            if (run.status !== "queued" && run.status !== "running" && run.status !== "retrying") throw new FrameFlowDomainError("只有生成中的 Run 可以取消", 409);
            return [{ type: "run.cancelled", eventId, runId: run.id, cancelledAt: occurredAt, reason: "user_requested" }];
        }
        if (command.type === "image.delete") {
            const image = this.projection.images[command.imageId];
            if (!image) throw new FrameFlowDomainError("找不到 Image Asset", 404);
            this.requireImageRequirementActive(image.id);
            if (image.status === "permanently_deleted") throw new FrameFlowDomainError("图片已经删除", 409);
            return [{ type: "image.permanently_deleted", eventId, imageId: image.id }];
        }
        const { imageId, feedback } = command;
        this.requireImageRequirementActive(imageId);
        if (this.projection.images[imageId]?.status === "permanently_deleted") throw new FrameFlowDomainError("已删除图片不能继续反馈", 409);
        if (feedback.kind === "rating") return [{ type: "feedback.rating_set", eventId, imageId, rating: feedback.rating }];
        if (feedback.kind === "comment") return [{ type: "feedback.comment_set", eventId, imageId, comment: feedback.comment }];
        if (feedback.kind === "soft_delete") return [{ type: "image.soft_deleted", eventId, imageId, reason: feedback.reason, ...(feedback.note ? { note: feedback.note } : {}) }];
        if (feedback.kind === "restore") return [{ type: "image.restored", eventId, imageId }];
        return [{ type: "preference.feature_reviewed", eventId, imageId, featureId: feedback.featureId, decision: feedback.decision, ...(feedback.value ? { value: feedback.value } : {}) }];
    }

    private async autoRunIterationEvents(autoRun: AutoRun, occurredAt: string, eventId: string): Promise<FrameFlowEvent[]> {
        if (!this.imageGenerator) throw new FrameFlowDomainError("FrameFlow Codex ImageGen 尚未配置", 409);
        const brief = this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
        const planned = await this.planRoundEvents(brief, brief.strategy, occurredAt, eventId, autoRun.id);
        const promptEvent = planned.find((event) => event.type === "prompt.version_created");
        if (!promptEvent || promptEvent.type !== "prompt.version_created") throw new FrameFlowDomainError("自动跑未生成 Prompt Version", 500);
        const runId = crypto.randomUUID();
        const slotIds = Array.from({ length: autoRun.count }, () => crypto.randomUUID());
        return [
            ...planned,
            { type: "prompt.approved", eventId: crypto.randomUUID(), promptVersionId: promptEvent.promptVersion.id, locks: {} },
            { type: "run.queued", eventId: crypto.randomUUID(), run: { id: runId, briefId: brief.id, promptVersionId: promptEvent.promptVersion.id, status: "queued", requestedCount: autoRun.count, slotIds, imageIds: [], createdAt: occurredAt } },
            { type: "run.started", eventId: crypto.randomUUID(), runId, startedAt: occurredAt },
            { type: "auto_run.iteration_started", eventId: crypto.randomUUID(), autoRunId: autoRun.id, iteration: autoRun.iteration + 1, runId, startedAt: occurredAt },
        ];
    }

    private async planRoundEvents(brief: import("./types.js").CreativeBrief, strategy: import("./types.js").CreativeBrief["strategy"], occurredAt: string, eventId: string, autoRunId?: string): Promise<FrameFlowEvent[]> {
        if (!this.planner) throw new FrameFlowDomainError("FrameFlow Codex Planner 尚未配置", 409);
        const preference = this.plannerPreference(brief.id);
        const machineReviews = autoRunId
            ? Object.values(this.projection.machineReviewsByImage).filter((review) => review.autoRunId === autoRunId).slice(-40)
            : [];
        const parsedPlan = promptPlanSchema.parse(await this.planner.plan({ brief: structuredClone(brief), strategy, preference, machineReviews: structuredClone(machineReviews) }));
        const { decision: decisionPlan, ...plan } = parsedPlan;
        if (preference.sampleSize > 0 && !decisionPlan) throw new FrameFlowDomainError("Codex Planner 未说明如何处置 Preference DNA 证据", 500);
        const previous = Object.values(this.projection.prompts).filter((prompt) => prompt.briefId === brief.id).at(-1);
        const promptVersionId = crypto.randomUUID();
        const decision = this.agentDecision({
            id: crypto.randomUUID(),
            briefId: brief.id,
            promptVersionId,
            profileId: brief.profileId,
            summary: decisionPlan?.summary || plan.reason,
            plannedEvidence: decisionPlan?.evidence || [],
            preference,
            createdAt: occurredAt,
        });
        const promptVersion: PromptVersion = {
            id: promptVersionId,
            ...(previous ? { parentId: previous.id } : {}),
            briefId: brief.id,
            revision: (previous?.revision || 0) + 1,
            status: "draft",
            ...plan,
            diff: buildPromptDiff(previous?.fields, plan.fields, plan.reason, decision, preference),
            decisionId: decision.id,
            referenceImageIds: [...brief.referenceImageIds],
            locks: {},
            createdAt: occurredAt,
        };
        return [
            { type: "prompt.version_created", eventId, promptVersion },
            { type: "agent.decision_recorded", eventId: crypto.randomUUID(), decision },
        ];
    }

    private recordAutoRunFailure(autoRunId: string, message: string): Promise<void> {
        const result = this.writeQueue.catch(() => undefined).then(async () => {
            await this.ready;
            if (!this.projection.autoRuns[autoRunId]) return;
            const failedAt = new Date().toISOString();
            const transaction: FrameFlowTransaction = {
                schemaVersion: 1,
                sequence: this.projection.sequence + 1,
                transactionId: crypto.randomUUID(),
                idempotencyKey: `system:auto-run-failure:${autoRunId}:${crypto.randomUUID()}`,
                occurredAt: failedAt,
                actor: { type: "system" },
                events: [{ type: "auto_run.failed", eventId: crypto.randomUUID(), autoRunId, error: message.slice(0, 500), failedAt }],
            };
            await this.store.append(transaction);
            this.remember(transaction);
            await this.store.writeProjection(this.projection);
        });
        this.writeQueue = result.catch(() => undefined);
        return result;
    }

    private referenceFiles(prompt: PromptVersion) {
        return prompt.referenceImageIds.map((imageId) => {
            const reference = this.projection.references[imageId];
            if (reference) return this.assets.absoluteReferencePath(reference);
            const image = this.projection.images[imageId];
            if (!image) throw new FrameFlowDomainError(`参考图尚未登记到 FrameFlow：${imageId}`, 409);
            return this.assets.absolutePath(image);
        });
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

    private currentBriefForRequirement(brief: CreativeBrief) {
        const requirementId = brief.requirementId ?? brief.id;
        const revisions = Object.values(this.projection.briefs)
            .filter((item) => (item.requirementId ?? item.id) === requirementId)
            .sort((left, right) => (left.revision ?? 1) - (right.revision ?? 1));
        return revisions.filter((item) => !item.supersededAt && !item.supersededByBriefId).at(-1) ?? revisions.at(-1) ?? brief;
    }

    private requirementState(briefId: string) {
        const brief = this.projection.briefs[briefId];
        if (!brief) return { requirementArchived: false, briefSuperseded: false };
        const current = this.currentBriefForRequirement(brief);
        return {
            requirementArchived: Boolean(current.archivedAt),
            briefSuperseded: current.id !== brief.id || Boolean(brief.supersededAt || brief.supersededByBriefId),
        };
    }

    private requireRequirementActive(briefId: string) {
        const brief = this.projection.briefs[briefId];
        if (!brief) throw new FrameFlowDomainError("找不到 Creative Brief", 404);
        if (this.currentBriefForRequirement(brief).archivedAt) throw new FrameFlowDomainError("该 Requirement 已归档，历史血缘只读", 409);
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

    private isBriefActive(brief: CreativeBrief) {
        return !brief.archivedAt && !brief.supersededAt && !brief.supersededByBriefId;
    }

    private requireActiveBrief(briefId: string, missingMessage = "找不到 Creative Brief") {
        const brief = this.projection.briefs[briefId];
        if (!brief) throw new FrameFlowDomainError(missingMessage, 404);
        this.requireRequirementActive(brief.id);
        if (this.currentBriefForRequirement(brief).id !== brief.id || brief.supersededAt || brief.supersededByBriefId) {
            throw new FrameFlowDomainError("该 Brief 不是当前 Brief 修订，已归档或已被新修订取代", 409);
        }
        return brief;
    }

    private plannerPreference(briefId: string): FrameFlowPreferenceContext {
        const dna = preferenceDna(this.projection, briefId);
        const evidence = (signal: PreferenceDnaResult["boost"][number]) => {
            const image = this.projection.images[signal.imageId];
            const prompt = image ? this.projection.prompts[image.promptVersionId] : undefined;
            const feedback = this.projection.feedbackByImage[signal.imageId];
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

    private agentDecision(input: {
        id: string;
        briefId: string;
        promptVersionId: string;
        profileId: string;
        summary: string;
        plannedEvidence: Array<{ imageId: string; disposition: "adopted" | "avoided" | "ignored"; affectedFields: PromptFieldKey[]; reason: string }>;
        preference: FrameFlowPreferenceContext;
        createdAt: string;
    }): AgentDecision {
        const available = [...input.preference.boost, ...input.preference.avoid];
        const availableByImage = new Map(available.map((evidence) => [evidence.imageId, evidence]));
        const plannedIds = input.plannedEvidence.map((evidence) => evidence.imageId);
        if (new Set(plannedIds).size !== plannedIds.length) throw new FrameFlowDomainError("Codex Planner 重复处置了同一条 Preference DNA 证据", 500);
        if (plannedIds.some((imageId) => !availableByImage.has(imageId))) throw new FrameFlowDomainError("Codex Planner 引用了不存在的 Preference DNA 证据", 500);
        if (available.some((evidence) => !plannedIds.includes(evidence.imageId))) throw new FrameFlowDomainError("Codex Planner 未完整处置 Preference DNA 证据", 500);
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

    private afterCommit(command: FrameFlowCommand, transaction: FrameFlowTransaction) {
        if (command.type === "run.cancel") {
            this.activeRuns.get(command.runId)?.abort();
            return;
        }
        if (command.type === "run.start" || command.type === "auto_run.start" || command.type === "auto_run.extend" || command.type === "auto_run.advance") {
            const reviewStarted = transaction.events.find((event) => event.type === "auto_run.review_started");
            if (reviewStarted?.type === "auto_run.review_started") {
                this.launchMachineReview(reviewStarted.autoRunId, reviewStarted.runId);
                return;
            }
            const queued = transaction.events.find((event) => event.type === "run.queued");
            if (!queued || queued.type !== "run.queued") {
                if (command.type === "auto_run.start" || command.type === "auto_run.extend" || command.type === "auto_run.advance") {
                    const autoRun = this.projection.autoRuns[command.autoRunId];
                    if (autoRun?.state === "generating" && !autoRun.currentRunId) this.launchAutoRunPlanning(autoRun.id);
                }
                return;
            }
            const prompt = this.projection.prompts[queued.run.promptVersionId];
            const brief = prompt ? this.projection.briefs[prompt.briefId] : undefined;
            if (prompt && brief) this.launchGeneration({ prompt, aspectRatio: brief.aspectRatio, cropPosition: generationCropPosition(prompt), runId: queued.run.id, slotIds: queued.run.slotIds, referenceFiles: this.referenceFiles(prompt) });
            return;
        }
        if (command.type === "run.retry") {
            const retry = transaction.events.find((event) => event.type === "run.retry_started");
            if (!retry || retry.type !== "run.retry_started") return;
            const run = this.projection.runs[retry.runId];
            const prompt = run ? this.projection.prompts[run.promptVersionId] : undefined;
            const brief = prompt ? this.projection.briefs[prompt.briefId] : undefined;
            if (run && prompt && brief) this.launchGeneration({ prompt, aspectRatio: brief.aspectRatio, cropPosition: generationCropPosition(prompt), runId: run.id, slotIds: retry.slotIds, referenceFiles: this.referenceFiles(prompt) });
        }
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
            await this.store.append(transaction);
            this.remember(transaction);
            await this.store.writeProjection(this.projection);
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
        let generatedFiles: string[];
        try {
            generatedFiles = await this.imageGenerator!.generate({
                prompt: structuredClone(input.prompt),
                count: input.slotIds.length,
                aspectRatio: input.aspectRatio,
                cropPosition: input.cropPosition,
                referenceFiles: input.referenceFiles,
                signal: input.controller.signal,
            });
        } catch {
            if (input.controller.signal.aborted) return;
            const error: GenerationError = { code: "IMAGEGEN_FAILED", message: "Codex ImageGen 生成失败，可重试该 slot", retryable: true };
            await this.enqueueRunFinalization({ ...input, images: [], error });
            return;
        }

        if (input.controller.signal.aborted) {
            await this.assets.quarantineGenerated(generatedFiles, { reason: "generation_cancelled", runId: input.runId, promptVersionId: input.prompt.id });
            return;
        }

        let images: FrameFlowImageAsset[];
        try {
            images = await this.assets.importGenerated(generatedFiles.slice(0, input.slotIds.length), {
                runId: input.runId,
                promptVersionId: input.prompt.id,
                aspectRatio: input.aspectRatio,
                cropPosition: input.cropPosition,
                createdAt: new Date().toISOString(),
            });
        } catch {
            await this.assets.quarantineGenerated(generatedFiles, { reason: input.controller.signal.aborted ? "generation_cancelled" : "asset_import_failed", runId: input.runId, promptVersionId: input.prompt.id });
            if (input.controller.signal.aborted) return;
            const error: GenerationError = { code: "IMAGE_VALIDATION_FAILED", message: "ImageGen 返回的图片未通过 PNG 校验，可重试该 slot", retryable: true };
            await this.enqueueRunFinalization({ ...input, images: [], error });
            return;
        }

        if (generatedFiles.length > input.slotIds.length) {
            await this.assets.quarantineGenerated(generatedFiles.slice(input.slotIds.length), { reason: "orphan_recovery", runId: input.runId, promptVersionId: input.prompt.id });
        }
        images.forEach((image) => image.referenceImageIds = [...input.prompt.referenceImageIds]);
        await this.enqueueRunFinalization({ ...input, images });
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

            const events: FrameFlowEvent[] = input.images.flatMap((image, index): FrameFlowEvent[] => [
                { type: "run.slot_succeeded", eventId: crypto.randomUUID(), runId: input.runId, slotId: input.slotIds[index]!, imageId: image.id },
                { type: "image.registered", eventId: crypto.randomUUID(), image },
            ]);
            const failedIds = input.slotIds.slice(input.images.length);
            if (failedIds.length) {
                const error = input.error || { code: "IMAGEGEN_MISSING_RESULT" as const, message: "ImageGen 未返回该 slot 的图片，可单独重试", retryable: true };
                events.push(...failedSlotEvents(input.runId, failedIds, error));
            }
            const previousSucceeded = run.slotIds.filter((slotId) => this.projection.slots[slotId]?.status === "succeeded").length;
            const totalSucceeded = previousSucceeded + input.images.length;
            const status = totalSucceeded === run.requestedCount ? "succeeded" : totalSucceeded > 0 ? "partially_succeeded" : "failed";
            const occurredAt = new Date().toISOString();
            events.push({ type: "run.completed", eventId: crypto.randomUUID(), runId: input.runId, status, completedAt: occurredAt });
            const autoRun = Object.values(this.projection.autoRuns).find((item) => item.currentRunId === input.runId && (item.state === "generating" || item.state === "paused"));
            if (autoRun?.state === "generating") {
                events.push(totalSucceeded > 0
                    ? { type: "auto_run.review_started", eventId: crypto.randomUUID(), autoRunId: autoRun.id, runId: input.runId, startedAt: occurredAt }
                    : { type: "auto_run.failed", eventId: crypto.randomUUID(), autoRunId: autoRun.id, error: "本轮没有生成可审核图片，请检查失败项后重新启动", failedAt: occurredAt });
            }
            const transaction: FrameFlowTransaction = {
                schemaVersion: 1,
                sequence: this.projection.sequence + 1,
                transactionId: crypto.randomUUID(),
                idempotencyKey: `system:run-finalize:${input.runId}:${crypto.randomUUID()}`,
                occurredAt,
                actor: { type: "system" },
                events,
            };
            try {
                await this.store.append(transaction);
            } catch (error) {
                await this.assets.quarantineImported(input.images, "journal_append_failed");
                throw error;
            }
            this.remember(transaction);
            await this.store.writeProjection(this.projection);
            if (autoRun && totalSucceeded > 0) this.launchMachineReview(autoRun.id, input.runId);
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
        const pendingImages = run.imageIds.filter((imageId) => !this.projection.machineReviewsByImage[imageId]).map((imageId) => {
            const image = this.projection.images[imageId];
            if (!image) throw new FrameFlowDomainError(`找不到机器审图图片：${imageId}`, 404);
            return { imageId, filePath: this.assets.absolutePath(image) };
        });
        if (!pendingImages.length) return autoRun.state === "reviewing" && autoRun.iteration < autoRun.maxIterations;
        const rawReviews = await this.imageReviewer!.review({
            brief: structuredClone(brief),
            prompt: structuredClone(prompt),
            autoRunId,
            runId,
            iteration: autoRun.iteration,
            images: pendingImages,
        });
        const reviews = rawReviews.map((review) => machineReviewResultSchema.parse(review));
        const expectedIds = pendingImages.map((image) => image.imageId);
        const actualIds = reviews.map((review) => review.imageId);
        if (new Set(actualIds).size !== actualIds.length || expectedIds.some((imageId) => !actualIds.includes(imageId)) || actualIds.some((imageId) => !expectedIds.includes(imageId))) {
            throw new FrameFlowDomainError("Codex 机器审图没有逐张覆盖本轮图片", 500);
        }

        const result = this.writeQueue.catch(() => undefined).then(async () => {
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            this.assertRequirementLifecycleUnchanged(brief.id, lifecycleToken);
            const occurredAt = new Date().toISOString();
            const current = this.projection.autoRuns[autoRunId];
            const events: FrameFlowEvent[] = reviews
                .filter((review) => !this.projection.machineReviewsByImage[review.imageId])
                .map((review) => ({
                    type: "machine_review.recorded",
                    eventId: crypto.randomUUID(),
                    review: { ...review, autoRunId, runId, iteration: autoRun.iteration, createdAt: occurredAt },
                }));
            if (!events.length) return current?.state === "reviewing" && current.iteration < current.maxIterations;
            if (current?.currentRunId === runId && current.state === "reviewing" && current.iteration >= current.maxIterations) {
                events.push({ type: "auto_run.completed", eventId: crypto.randomUUID(), autoRunId, runId, completedAt: occurredAt });
            }
            const transaction: FrameFlowTransaction = {
                schemaVersion: 1,
                sequence: this.projection.sequence + 1,
                transactionId: crypto.randomUUID(),
                idempotencyKey: `system:machine-review:${runId}:${crypto.randomUUID()}`,
                occurredAt,
                actor: { type: "agent" },
                events,
            };
            await this.store.append(transaction);
            this.remember(transaction);
            await this.store.writeProjection(this.projection);
            const updated = this.projection.autoRuns[autoRunId];
            return updated?.state === "reviewing" && updated.iteration < updated.maxIterations;
        });
        this.writeQueue = result.catch(() => undefined);
        return await result;
    }

    private canContinueExploration(autoRun: AutoRun) {
        const brief = this.projection.briefs[autoRun.briefId];
        if (!brief || !this.isBriefActive(brief)) return false;
        if (autoRun.state !== "completed" || autoRun.maxIterations >= 20 || !autoRun.currentRunId) return false;
        const run = this.projection.runs[autoRun.currentRunId];
        return Boolean(run?.imageIds.some((imageId) => this.projection.machineReviewsByImage[imageId]?.decision === "vary"));
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
        const trajectory = this.autoRunTrajectory(autoRunId);
        const reviewedRounds = trajectory.rounds.filter((round) => round.images.length > 0 && round.images.every((item) => item.machineReview));
        if (reviewedRounds.length < 2) throw new FrameFlowDomainError("至少需要两轮完整 Machine Review 才能生成跨轮总结", 409);
        const throughIteration = reviewedRounds.at(-1)!.iteration;
        const existing = this.projection.trajectorySummariesByAutoRun[autoRunId];
        if (!force && existing?.throughIteration === throughIteration) return structuredClone(existing);
        const draft = autoRunTrajectorySummaryDraftSchema.parse(await this.trajectorySummarizer.summarize({
            brief: structuredClone(trajectory.brief),
            rounds: reviewedRounds.map((round) => ({
                iteration: round.iteration,
                prompt: structuredClone(round.prompt),
                machineReviews: round.images.flatMap((item) => item.machineReview ? [structuredClone(item.machineReview)] : []),
            })),
        }));
        const iterationSet = new Set(reviewedRounds.map((round) => round.iteration));
        const evidenceIterations = [...draft.improved, ...draft.recurring].flatMap((item) => item.evidenceIterations);
        if (!iterationSet.has(draft.bestIteration) || evidenceIterations.some((iteration) => !iterationSet.has(iteration))) {
            throw new FrameFlowDomainError("Codex 跨轮总结引用了不存在的轮次", 500);
        }
        const createdAt = new Date().toISOString();
        const summary: AutoRunTrajectorySummary = { ...draft, autoRunId, throughIteration, createdAt };
        const result = this.writeQueue.catch(() => undefined).then(async () => {
            this.requireActiveBrief(autoRun.briefId, "找不到自动跑对应的方向");
            this.assertRequirementLifecycleUnchanged(autoRun.briefId, lifecycleToken);
            const transaction: FrameFlowTransaction = {
                schemaVersion: 1,
                sequence: this.projection.sequence + 1,
                transactionId: crypto.randomUUID(),
                idempotencyKey: `system:trajectory-summary:${autoRunId}:${throughIteration}:${crypto.randomUUID()}`,
                occurredAt: createdAt,
                actor: { type: "agent" },
                events: [{ type: "auto_run.trajectory_summarized", eventId: crypto.randomUUID(), summary }],
            };
            await this.store.append(transaction);
            this.remember(transaction);
            await this.store.writeProjection(this.projection);
            return structuredClone(summary);
        });
        this.writeQueue = result.catch(() => undefined);
        return await result;
    }

    private promptLineage(promptVersionId: string): PromptLineageResult {
        const versions = [];
        let current: PromptVersion | undefined = this.projection.prompts[promptVersionId];
        if (!current) throw new FrameFlowDomainError("找不到 Prompt Version", 404);
        while (current) {
            versions.unshift(structuredClone(current));
            current = current.parentId ? this.projection.prompts[current.parentId] : undefined;
        }
        const decisions = versions.flatMap((version) => version.decisionId && this.projection.decisions[version.decisionId] ? [structuredClone(this.projection.decisions[version.decisionId]!)] : []);
        return { type: "prompt.lineage", promptVersionId, versions, decisions };
    }

    private autoRunTrajectory(autoRunId: string): AutoRunTrajectoryResult {
        const autoRun = this.projection.autoRuns[autoRunId];
        if (!autoRun) throw new FrameFlowDomainError("找不到自动跑", 404);
        const brief = this.projection.briefs[autoRun.briefId];
        if (!brief) throw new FrameFlowDomainError("自动跑缺少 Exploration Direction 血缘", 500);
        const rounds = this.transactions
            .flatMap((transaction) => transaction.events)
            .filter((event) => event.type === "auto_run.iteration_started" && event.autoRunId === autoRunId)
            .map((event) => {
                if (event.type !== "auto_run.iteration_started") throw new FrameFlowDomainError("自动跑演化事件无效", 500);
                const run = this.projection.runs[event.runId];
                const prompt = run ? this.projection.prompts[run.promptVersionId] : undefined;
                if (!run || !prompt) throw new FrameFlowDomainError("自动跑演化血缘不完整", 500);
                return {
                    iteration: event.iteration,
                    run: structuredClone(run),
                    prompt: structuredClone(prompt),
                    images: run.imageIds.map((imageId) => {
                        const image = this.projection.images[imageId];
                        if (!image) throw new FrameFlowDomainError("自动跑演化图片血缘不完整", 500);
                        const machineReview = this.projection.machineReviewsByImage[imageId];
                        return {
                            image: structuredClone(image),
                            ...(machineReview ? { machineReview: structuredClone(machineReview) } : {}),
                        };
                    }),
                };
            })
            .sort((left, right) => left.iteration - right.iteration);
        return {
            type: "auto_run.trajectory",
            autoRun: {
                ...structuredClone(autoRun),
                ...this.requirementState(autoRun.briefId),
                canContinueExploration: this.canContinueExploration(autoRun),
            },
            brief: structuredClone(brief),
            rounds,
            ...(this.projection.trajectorySummariesByAutoRun[autoRunId] ? { summary: structuredClone(this.projection.trajectorySummariesByAutoRun[autoRunId]) } : {}),
        };
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

    private remember(transaction: FrameFlowTransaction) {
        this.transactions.push(structuredClone(transaction));
        this.transactionsByKey.set(transaction.idempotencyKey, structuredClone(transaction));
        this.projection = applyTransaction(this.projection, transaction);
    }

}

function planningAutoRun(autoRun: AutoRun, updatedAt: string): AutoRun {
    const next = { ...structuredClone(autoRun), state: "generating" as const, lastStartedAt: updatedAt, updatedAt };
    delete next.currentRunId;
    delete next.lastError;
    return next;
}

function generationCropPosition(prompt: PromptVersion): "top" | "attention" {
    const context = [
        prompt.compiledPrompt,
        ...prompt.fields.subject,
        ...prompt.fields.composition,
        ...prompt.fields.layout,
        ...prompt.fields.technical,
    ].join(" ");
    return /\b(?:dashboard|user interface|ui concept|web interface|website|web page|app screen|top navigation|header|toolbar)\b/i.test(context) ? "top" : "attention";
}

function failedSlotEvents(runId: string, slotIds: string[], error: GenerationError): FrameFlowEvent[] {
    return slotIds.map((slotId) => ({ type: "run.slot_failed", eventId: crypto.randomUUID(), runId, slotId, error: structuredClone(error) }));
}

function unique(values: string[]) {
    return [...new Set(values)];
}
