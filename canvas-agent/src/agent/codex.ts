import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

import type { CanvasSnapshot } from "../canvas/types.js";
import { autoRunTrajectorySummaryDraftSchema, machineReviewResultSchema, promptPlanSchema, promptTranslationSchema } from "../frameflow/schemas.js";
import type { AutoRunTrajectorySummaryDraft, PromptPlan, PromptTranslation } from "../frameflow/types.js";
import { logger } from "../utils/logger.js";
import { errorMessage, field, type JsonRecord } from "../utils/value.js";
import { CodexAppClient, CodexReportedError } from "./codex-client.js";
import { codexEventHistory } from "./codex-event-history.js";
import { settledTurnIds, summarizeCodexThread, threadMessages } from "./codex-history.js";
import { assertDraftHasNoSensitiveValues, canvasPrivateValues, canvasSkillSource } from "./canvas-skill-safety.js";
import { frameFlowImageRequest, frameFlowPromptRequest, frameFlowReviewRequest, frameFlowTrajectorySummaryRequest, frameFlowTranslationRequest, type FrameFlowImageInput, type FrameFlowImageReviewInput, type FrameFlowPromptInput, type FrameFlowPromptTranslationInput, type FrameFlowTrajectorySummaryInput } from "./codex-frameflow-requests.js";
import { canvasImageRequest, interiorImageRequest, interiorPromptRequest, type CanvasImageInput, type InteriorImageInput, type InteriorPromptInput } from "./codex-image-requests.js";
import { messageMetadataStore } from "./message-metadata.js";
import type { CodexReasoningEffort, CodexSkillMetadata, CodexSkillSelector, CodexSkillsListEntry } from "./codex-protocol.js";
import type { AgentAttachment, AgentEmit, AgentPermissionMode } from "./types.js";

type CodexRunOptions = { threadId?: string; cwd?: string; permissionMode?: AgentPermissionMode; model?: string; effort?: CodexReasoningEffort; skill?: CodexSkillSelector; messageText?: string; appEmit?: AgentEmit; onStart?: () => void; onThread?: (threadId: string) => void; onTurn?: (turnId: string) => void; onFinish?: () => void };
type CodexSkillDraftInput = { model?: string; effort?: CodexReasoningEffort } & ({ source: "conversation"; threadId: string } | { source: "canvas"; snapshot: CanvasSnapshot });
export type { CanvasImageInput, InteriorImageInput, InteriorImageStage, InteriorPromptInput, InteriorPromptStage } from "./codex-image-requests.js";
export type { FrameFlowImageInput, FrameFlowImageReviewInput, FrameFlowPromptInput, FrameFlowPromptTranslationInput, FrameFlowTrajectorySummaryInput } from "./codex-frameflow-requests.js";

const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const skillDraftSchema = z.object({
    name: z.string().trim().min(1).max(64).regex(skillNamePattern),
    displayName: z.string().trim().max(64),
    description: z.string().trim().min(1).max(1024).refine((value) => !/[<>]/.test(value)),
    instructions: z.string().trim().min(1).max(20000),
    shortDescription: z.string().trim().max(64).refine((value) => !value || value.length >= 25),
    defaultPrompt: z.string().trim().max(1024),
}).strict().superRefine((draft, context) => {
    if (draft.defaultPrompt && !mentionsSkill(draft.defaultPrompt, draft.name)) context.addIssue({ code: "custom", path: ["defaultPrompt"], message: `默认提示词必须包含 $${draft.name}` });
});

const SKILL_DRAFT_OUTPUT_SCHEMA: JsonRecord = {
    type: "object",
    additionalProperties: false,
    required: ["name", "displayName", "description", "instructions", "shortDescription", "defaultPrompt"],
    properties: {
        name: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", minLength: 1, maxLength: 64 },
        displayName: { type: "string", maxLength: 64 },
        description: { type: "string", pattern: "^[^<>]+$", minLength: 1, maxLength: 1024 },
        instructions: { type: "string", minLength: 1, maxLength: 20000 },
        shortDescription: { anyOf: [{ type: "string", maxLength: 0 }, { type: "string", minLength: 25, maxLength: 64 }] },
        defaultPrompt: { type: "string", maxLength: 1024 },
    },
};

export type AgentSkillDraft = z.infer<typeof skillDraftSchema>;
const interiorPromptSchema = z.object({
    title: z.string().trim().min(1).max(80),
    prompt: z.string().trim().min(1).max(8000),
    negativePrompt: z.string().trim().max(3000),
    summary: z.string().trim().min(1).max(800),
}).strict();
const INTERIOR_PROMPT_OUTPUT_SCHEMA: JsonRecord = {
    type: "object",
    additionalProperties: false,
    required: ["title", "prompt", "negativePrompt", "summary"],
    properties: {
        title: { type: "string", minLength: 1, maxLength: 80 },
        prompt: { type: "string", minLength: 1, maxLength: 8000 },
        negativePrompt: { type: "string", maxLength: 3000 },
        summary: { type: "string", minLength: 1, maxLength: 800 },
    },
};
const INTERIOR_PROMPT_INSTRUCTIONS = "你是专业室内建筑可视化与镜头设计提示词工程师。只分析用户提供的空间信息和参考图，生成可直接交给图像或视频模型的制作提示词。不得调用工具、执行命令、读取其他文件、访问网络或修改状态。严格按 outputSchema 返回结果；prompt 使用适合生成模型的英文，summary 使用简体中文。";
const INTERIOR_IMAGE_INSTRUCTIONS = "你是专业室内建筑可视化执行 Agent。你的唯一任务是使用 Codex 原生 ImageGen 功能，根据用户提示词和唯一参考图生成图片。不得调用命令、访问网络、读取其他文件或使用其他工具；必须保留参考图的空间几何和视角。生成完成后不要解释。";
const CANVAS_IMAGE_INSTRUCTIONS = "你是 Infinite Canvas 图像生成执行 Agent。唯一任务是调用 Codex 原生 ImageGen，根据用户提示词生成图片。提供参考图时必须遵守其主体、构图与编辑约束。不得执行命令、访问网络、读取未提供的文件或调用其他工具；生成完成后不要解释。";
const FRAMEFLOW_PROMPT_INSTRUCTIONS = "你是 FrameFlow 的结构化图像提示词规划 Agent。根据请求中的 Creative Brief、Preference DNA 与本自动跑此前的 Machine Review 生成 Prompt Version，不得调用工具、执行命令、读取文件、访问网络或修改状态。Creative Brief 的硬约束优先；Machine Review 的 keep/vary/reject、strengths 与 issues 用于自动保留、变体或规避当前方向；Preference DNA 的 boost/avoid 只代表人工偏好。必须在 reason 中明确说明如何根据机器审图改进下一轮；decision.evidence 只逐条处置人工 Preference DNA：adopted 表示采纳，avoided 表示主动规避，ignored 表示因冲突或不适用于本 Brief 而忽略，不得把机器自评冒充人工证据。不得遗漏、重复或编造 imageId。所有 fields 和 compiledPrompt 使用适合图像生成模型的英文；translations.zh-CN 必须逐字段忠实翻译英文执行 Prompt，不增删约束；reason、decision.summary 与 decision.evidence.reason 使用简体中文。严格按 outputSchema 返回对象。";
const FRAMEFLOW_TRANSLATION_INSTRUCTIONS = "你是 FrameFlow Prompt 翻译 Agent。把给定的英文执行 Prompt 忠实翻译为简体中文，仅用于人工阅读与审核。必须逐字段保持原意、顺序、数量、技术参数、否定约束和画幅信息，不得优化、增删或改写执行意图。不得调用工具、执行命令、读取文件、访问网络或修改状态。严格按 outputSchema 返回对象。";
const FRAMEFLOW_IMAGE_INSTRUCTIONS = "你是 FrameFlow 图像生成执行 Agent。唯一任务是调用 Codex 原生 ImageGen，根据已批准 Prompt 生成 PNG 图片；目标画幅是硬约束，必须优先选择与请求比例一致的原生输出尺寸，禁止拉伸、边框或留黑。不得执行命令、访问网络、读取未提供的文件或调用其他工具。提供参考图时必须保留其明确约束，生成后不要输出说明。";
const FRAMEFLOW_REVIEW_INSTRUCTIONS = "你是 FrameFlow 的机器审图 Agent。只审查请求中明确附带的本轮图片，不得调用工具、执行命令、读取其他文件、访问网络或修改状态。逐张对照 Creative Brief、批准 Prompt、画幅、构图、主体、风格一致性和技术缺陷评分，并给出可执行的下一轮改进意见。评分是机器判断，不能冒充用户偏好；不得请求删除文件。严格按 outputSchema 返回对象。";
const FRAMEFLOW_TRAJECTORY_SUMMARY_INSTRUCTIONS = "你是 FrameFlow 的跨轮 Machine Review 分析 Agent。只根据请求中给出的 Creative Brief、各轮 Prompt Diff 与 Machine Review 做语义归纳，不得调用工具、执行命令、读取文件、访问网络或修改状态。识别哪些问题在后续轮次中明显改善、哪些问题重复出现或在最新轮仍未解决，并从已有轮次中推荐当前最佳轮次。机器判断不能冒充用户偏好，也不能写入 Preference DNA。不要按字符串是否相同做机械计数，要合并语义相同的问题并给出具体证据轮次。严格按 outputSchema 返回简体中文对象。";
const frameFlowPromptValues: JsonRecord = { type: "array", maxItems: 100, items: { type: "string", minLength: 1, maxLength: 500 } };
const frameFlowPromptFieldsOutput: JsonRecord = {
    type: "object",
    additionalProperties: false,
    required: ["subject", "composition", "color", "lighting", "material", "layout", "mood", "rendering", "technical", "negative"],
    properties: {
        subject: frameFlowPromptValues,
        composition: frameFlowPromptValues,
        color: frameFlowPromptValues,
        lighting: frameFlowPromptValues,
        material: frameFlowPromptValues,
        layout: frameFlowPromptValues,
        mood: frameFlowPromptValues,
        rendering: frameFlowPromptValues,
        technical: frameFlowPromptValues,
        negative: frameFlowPromptValues,
    },
};
const FRAMEFLOW_TRANSLATION_OUTPUT_SCHEMA: JsonRecord = {
    type: "object",
    additionalProperties: false,
    required: ["fields", "compiledPrompt"],
    properties: {
        fields: frameFlowPromptFieldsOutput,
        compiledPrompt: { type: "string", minLength: 1, maxLength: 12000 },
    },
};
const FRAMEFLOW_PROMPT_OUTPUT_SCHEMA: JsonRecord = {
    type: "object",
    additionalProperties: false,
    required: ["fields", "compiledPrompt", "translations", "reason", "decision"],
    properties: {
        fields: frameFlowPromptFieldsOutput,
        compiledPrompt: { type: "string", minLength: 1, maxLength: 12000 },
        translations: {
            type: "object",
            additionalProperties: false,
            required: ["zh-CN"],
            properties: { "zh-CN": FRAMEFLOW_TRANSLATION_OUTPUT_SCHEMA },
        },
        reason: { type: "string", minLength: 1, maxLength: 2000 },
        decision: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "evidence"],
            properties: {
                summary: { type: "string", minLength: 1, maxLength: 2000 },
                evidence: {
                    type: "array",
                    maxItems: 200,
                    items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["imageId", "disposition", "affectedFields", "reason"],
                        properties: {
                            imageId: { type: "string", minLength: 1, maxLength: 200 },
                            disposition: { type: "string", enum: ["adopted", "avoided", "ignored"] },
                            affectedFields: { type: "array", minItems: 1, maxItems: 10, items: { type: "string", enum: ["subject", "composition", "color", "lighting", "material", "layout", "mood", "rendering", "technical", "negative"] } },
                            reason: { type: "string", minLength: 1, maxLength: 2000 },
                        },
                    },
                },
            },
        },
    },
};
const FRAMEFLOW_REVIEW_OUTPUT_SCHEMA: JsonRecord = {
    type: "object",
    additionalProperties: false,
    required: ["reviews"],
    properties: {
        reviews: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: {
                type: "object",
                additionalProperties: false,
                required: ["imageId", "rating", "comment", "decision", "strengths", "issues"],
                properties: {
                    imageId: { type: "string", minLength: 1, maxLength: 200 },
                    rating: { type: "integer", minimum: 1, maximum: 5 },
                    comment: { type: "string", minLength: 1, maxLength: 2000 },
                    decision: { type: "string", enum: ["keep", "vary", "reject"] },
                    strengths: { type: "array", maxItems: 20, items: { type: "string", minLength: 1, maxLength: 500 } },
                    issues: { type: "array", maxItems: 20, items: { type: "string", minLength: 1, maxLength: 500 } },
                },
            },
        },
    },
};
const FRAMEFLOW_TRAJECTORY_SUMMARY_OUTPUT_SCHEMA: JsonRecord = {
    type: "object",
    additionalProperties: false,
    required: ["improved", "recurring", "bestIteration", "bestReason"],
    properties: {
        improved: {
            type: "array",
            maxItems: 20,
            items: {
                type: "object",
                additionalProperties: false,
                required: ["issue", "evidenceIterations", "explanation"],
                properties: {
                    issue: { type: "string", minLength: 1, maxLength: 500 },
                    evidenceIterations: { type: "array", minItems: 1, maxItems: 20, items: { type: "integer", minimum: 1, maximum: 20 } },
                    explanation: { type: "string", minLength: 1, maxLength: 2000 },
                },
            },
        },
        recurring: {
            type: "array",
            maxItems: 20,
            items: {
                type: "object",
                additionalProperties: false,
                required: ["issue", "evidenceIterations", "recommendation"],
                properties: {
                    issue: { type: "string", minLength: 1, maxLength: 500 },
                    evidenceIterations: { type: "array", minItems: 1, maxItems: 20, items: { type: "integer", minimum: 1, maximum: 20 } },
                    recommendation: { type: "string", minLength: 1, maxLength: 2000 },
                },
            },
        },
        bestIteration: { type: "integer", minimum: 1, maximum: 20 },
        bestReason: { type: "string", minLength: 1, maxLength: 2000 },
    },
};

export class CodexSkillLookupError extends Error {
    override name = "CodexSkillLookupError";
    constructor(message: string, readonly statusCode: 400 | 404 | 409) {
        super(message);
    }
}

let codexQueue: Promise<unknown> = Promise.resolve();
let codexApp: CodexAppClient | null = null;
let codexAppStart: Promise<CodexAppClient> | null = null;
/** 仅表示最近主动加载/选择的线程；运行中的 turn 身份由 CodexAppClient 自己维护。 */
let loadedThreadId = "";

export { summarizeCodexThread } from "./codex-history.js";

/** 将 Codex turn 加入串行队列并等待执行完成。 */
export async function runCodexTurn(prompt: string, lifecycleEmit: AgentEmit, attachments: AgentAttachment[] = [], options: CodexRunOptions = {}) {
    if (!prompt.trim()) return;
    codexQueue = codexQueue.catch(() => undefined).then(() => runCodexTurnNow(prompt, lifecycleEmit, attachments, options));
    await codexQueue;
}

/** 从当前对话或指定网页画布生成可编辑草稿，不写入 Skill 文件。 */
export async function generateCodexSkillDraft(emit: AgentEmit, cwd: string, input: CodexSkillDraftInput): Promise<AgentSkillDraft> {
    const queued = codexQueue.catch(() => undefined).then(() => generateCodexSkillDraftNow(emit, cwd, input));
    codexQueue = queued;
    return await queued;
}

/** 使用独立的只读 Codex 临时线程生成室内设计工作流提示词。 */
export async function generateInteriorPrompt(emit: AgentEmit, cwd: string, input: InteriorPromptInput) {
    const queued = codexQueue.catch(() => undefined).then(() => generateInteriorPromptNow(emit, cwd, input));
    codexQueue = queued;
    return await queued;
}

/** 使用独立 Codex 临时线程调用原生 ImageGen 生成室内图片。 */
export async function generateInteriorImages(emit: AgentEmit, cwd: string, input: InteriorImageInput) {
    const queued = codexQueue.catch(() => undefined).then(() => generateInteriorImagesNow(emit, cwd, input));
    codexQueue = queued;
    return await queued;
}

/** 使用独立 Codex 临时线程，让无限画布中的任意生图操作调用原生 ImageGen。 */
export async function generateCanvasImages(emit: AgentEmit, cwd: string, input: CanvasImageInput) {
    const queued = codexQueue.catch(() => undefined).then(() => generateCanvasImagesNow(emit, cwd, input));
    codexQueue = queued;
    return await queued;
}

/** 使用独立只读 Codex 线程把 Creative Brief 规划为结构化 Prompt Version。 */
export async function generateFrameFlowPrompt(emit: AgentEmit, cwd: string, input: FrameFlowPromptInput): Promise<PromptPlan> {
    const queued = codexQueue.catch(() => undefined).then(() => generateFrameFlowPromptNow(emit, cwd, input));
    codexQueue = queued;
    return await queued;
}

/** 为已有 Prompt Version 补充不参与执行的中文审核翻译。 */
export async function generateFrameFlowPromptTranslation(emit: AgentEmit, cwd: string, input: FrameFlowPromptTranslationInput): Promise<PromptTranslation> {
    const queued = codexQueue.catch(() => undefined).then(() => generateFrameFlowPromptTranslationNow(emit, cwd, input));
    codexQueue = queued;
    return await queued;
}

/** 使用独立 Codex 临时线程调用原生 ImageGen 执行已批准 Prompt。 */
export async function generateFrameFlowImages(emit: AgentEmit, cwd: string, input: FrameFlowImageInput) {
    const queued = codexQueue.catch(() => undefined).then(() => generateFrameFlowImagesNow(emit, cwd, input));
    codexQueue = queued;
    return await queued;
}

/** 使用独立只读 Codex 线程逐张审查本轮图片，并返回不污染人工偏好的机器判断。 */
export async function reviewFrameFlowImages(emit: AgentEmit, cwd: string, input: FrameFlowImageReviewInput) {
    const queued = codexQueue.catch(() => undefined).then(() => reviewFrameFlowImagesNow(emit, cwd, input));
    codexQueue = queued;
    return await queued;
}

/** 使用独立只读 Codex 线程语义比较各轮机器审图，并推荐当前最佳轮次。 */
export async function summarizeFrameFlowTrajectory(emit: AgentEmit, cwd: string, input: FrameFlowTrajectorySummaryInput): Promise<AutoRunTrajectorySummaryDraft> {
    const queued = codexQueue.catch(() => undefined).then(() => summarizeFrameFlowTrajectoryNow(emit, cwd, input));
    codexQueue = queued;
    return await queued;
}

/** 中断当前线程正在执行的 Codex turn。 */
export async function interruptCodexTurn(threadId?: string) {
    if (!codexApp) return false;
    return await codexApp.interruptCurrentTurn(threadId);
}

/** 回复当前 app-server 的待处理权限请求。 */
export async function resolveCodexApproval(requestId: string, decision: string) {
    return Boolean(codexApp?.resolveApproval(requestId, decision));
}

/** 创建新的 Codex 线程并记录当前线程 ID。 */
export async function startCodexThread(emit: AgentEmit, cwd?: string, permissionMode: AgentPermissionMode = "request", preheat = false) {
    const app = await getCodexApp(emit);
    const thread = await app.startThread(cwd, permissionMode, preheat);
    loadedThreadId = String(field(thread, "id") || "");
    return thread;
}

/** 恢复指定 Codex 线程并返回聊天历史。 */
export async function resumeCodexThread(emit: AgentEmit, threadId: string, cwd?: string, permissionMode: AgentPermissionMode = "request", preheat = false) {
    const app = await getCodexApp(emit);
    const thread = await resumeLoadedThread(app, threadId, cwd, permissionMode, true, preheat);
    const history = await loadCodexHistory(emit, threadId, cwd);
    const supplementalItems = await codexEventHistory.readThread(threadId);
    const messages = await mergeMessageMetadata(threadId, threadMessages(history.thread, app.planUpdates(threadId), supplementalItems));
    return { thread, messages, settledTurnIds: settledTurnIds(history.thread, supplementalItems), historyReady: history.historyReady };
}

/** 查询当前工作空间中的 Codex 线程。 */
export async function listCodexThreads(emit: AgentEmit, options: { cwd: string; searchTerm?: string; limit?: number }) {
    const app = await getCodexApp(emit);
    const result = await app.listThreads({
        limit: options.limit || 40,
        sortKey: "updated_at",
        sortDirection: "desc",
        sourceKinds: ["cli", "vscode", "appServer", "exec"],
        cwd: options.cwd,
        ...(options.searchTerm ? { searchTerm: options.searchTerm } : {}),
    });
    const data = Array.isArray(field(result, "data")) ? (field(result, "data") as unknown[]).map(summarizeCodexThread).filter((thread) => threadInWorkspace(thread, options.cwd)) : [];
    return { data, nextCursor: field(result, "nextCursor") || null, backwardsCursor: field(result, "backwardsCursor") || null };
}

/** 查询当前账号可用于新任务的 Codex 模型。 */
export async function listCodexModels(emit: AgentEmit) {
    return await (await getCodexApp(emit)).listModels();
}

/** 查询当前工作空间的原生 Skill 列表。 */
export async function listCodexSkills(emit: AgentEmit, cwd: string, forceReload = false): Promise<CodexSkillsListEntry> {
    const result = await (await getCodexApp(emit)).listSkills(cwd, forceReload);
    return result.data.find((entry) => samePath(entry.cwd, cwd)) || { cwd, skills: [], errors: [] };
}

/** 从原生 Skill 列表中解析并校验浏览器提交的选择器。 */
export async function resolveCodexSkill(emit: AgentEmit, cwd: string, selector: CodexSkillSelector, requireEnabled = false): Promise<CodexSkillMetadata> {
    const name = String(selector?.name || "");
    const requestedPath = String(selector?.path || "");
    if (!name || !requestedPath || !path.isAbsolute(requestedPath)) throw new CodexSkillLookupError("Skill 选择无效", 400);
    const { skills } = await listCodexSkills(emit, cwd, true);
    const skill = skills.find((item) => item.name === name && samePath(item.path, requestedPath));
    if (!skill) throw new CodexSkillLookupError("找不到指定 Skill，请刷新列表后重试", 404);
    if (requireEnabled && !skill.enabled) throw new CodexSkillLookupError("该 Skill 已停用，请先启用后再使用", 409);
    return skill;
}

/** 修改经过原生列表校验的 Skill 启用状态。 */
export async function configureCodexSkill(emit: AgentEmit, cwd: string, selector: CodexSkillSelector, enabled: boolean) {
    const skill = await resolveCodexSkill(emit, cwd, selector);
    const result = await (await getCodexApp(emit)).setSkillEnabled(skill.path, enabled);
    return { ...result, skill: { ...skill, enabled: result.effectiveEnabled } };
}

/** 读取指定 Codex 线程及其聊天历史。 */
export async function readCodexThread(emit: AgentEmit, threadId: string, cwd?: string) {
    const app = await getCodexApp(emit);
    const history = await loadCodexHistory(emit, threadId, cwd);
    const supplementalItems = await codexEventHistory.readThread(threadId);
    const messages = await mergeMessageMetadata(threadId, threadMessages(history.thread, app.planUpdates(threadId), supplementalItems));
    return { thread: summarizeCodexThread(history.thread), messages, settledTurnIds: settledTurnIds(history.thread, supplementalItems), historyReady: history.historyReady };
}

/** 归档指定 Codex 线程。 */
export async function archiveCodexThread(emit: AgentEmit, threadId: string, cwd?: string) {
    const app = await getCodexApp(emit);
    try {
        await loadCodexThread(emit, threadId, cwd, false);
    } catch (error) {
        if (!isRecoverableThreadError(error)) throw error;
        await resumeLoadedThread(app, threadId, cwd, "request", false);
    }
    await app.archiveThread(threadId);
    app.clearPlanUpdates(threadId);
    await codexEventHistory.removeThread(threadId);
    await messageMetadataStore.removeThread(threadId).catch((error) => logger.warn("Failed to remove archived thread message metadata", { threadId, error }));
    if (loadedThreadId === threadId) loadedThreadId = "";
}

async function mergeMessageMetadata<T extends { role: string; threadId: string; turnId: string }>(threadId: string, messages: T[]) {
    try {
        return await messageMetadataStore.mergeThread(threadId, messages);
    } catch (error) {
        logger.warn("Failed to read thread message metadata", { threadId, error });
        return messages;
    }
}

/** 判断线程异常是否允许自动新建线程后重试。 */
export function isRecoverableThreadError(error: unknown) {
    return /thread not loaded|no rollout found/i.test(errorMessage(error));
}

/** 执行一次 Codex turn，并负责附件临时文件和线程恢复。 */
async function runCodexTurnNow(prompt: string, lifecycleEmit: AgentEmit, attachments: AgentAttachment[], options: CodexRunOptions) {
    let files: string[] = [];
    try {
        options.onStart?.();
        files = await writeAttachmentFiles(attachments);
        const app = await getCodexApp(options.appEmit || lifecycleEmit);
        let threadId = await ensureCodexThread(app, options, lifecycleEmit);
        options.onThread?.(threadId);
        try {
            await app.startTurn(threadId, prompt, files, options.permissionMode || "request", options.model, options.effort, options.onTurn, options.skill, options.messageText);
        } catch (error) {
            if (!isRecoverableThreadError(error)) throw error;
            lifecycleEmit("agent_log", { text: `Codex thread unavailable, starting a new thread: ${errorMessage(error)}` });
            loadedThreadId = "";
            threadId = await ensureCodexThread(app, { cwd: options.cwd }, lifecycleEmit);
            options.onThread?.(threadId);
            await app.startTurn(threadId, prompt, files, options.permissionMode || "request", options.model, options.effort, options.onTurn, options.skill, options.messageText);
        }
    } catch (error) {
        logger.error("Codex turn failed", error);
        if (!(error instanceof CodexReportedError)) lifecycleEmit("agent_error", { message: errorMessage(error) });
    } finally {
        options.onFinish?.();
        await Promise.all(files.map((file) => fs.unlink(file).catch(() => undefined)));
    }
}

/** 恢复请求线程或创建新的 Codex 线程。 */
async function ensureCodexThread(app: CodexAppClient, options: CodexRunOptions, emit: AgentEmit) {
    if (options.threadId) {
        if (options.threadId === loadedThreadId) return loadedThreadId;
        try {
            await resumeLoadedThread(app, options.threadId, options.cwd, options.permissionMode || "request", true);
            return loadedThreadId;
        } catch (error) {
            if (!isRecoverableThreadError(error)) throw error;
            emit("agent_log", { text: `Codex thread unavailable, starting a new thread: ${errorMessage(error)}` });
            loadedThreadId = "";
        }
    }
    if (!loadedThreadId) {
        const thread = await app.startThread(options.cwd, options.permissionMode || "request");
        loadedThreadId = String(field(thread, "id") || "");
    }
    return loadedThreadId;
}

/** 从 app-server 读取线程并校验工作空间。 */
async function loadCodexThread(emit: AgentEmit, threadId: string, cwd: string | undefined, includeTurns: boolean) {
    const app = await getCodexApp(emit);
    const result = await app.readThread(threadId, includeTurns);
    const thread = field(result, "thread") || {};
    assertThreadWorkspace(thread, cwd);
    return thread;
}

async function generateCodexSkillDraftNow(emit: AgentEmit, cwd: string, input: CodexSkillDraftInput) {
    const app = await getCodexApp(emit);
    let threadId = "";
    try {
        const thread = input.source === "conversation" ? await app.forkSkillDraftThread(input.threadId, cwd) : await app.startSkillDraftThread(cwd);
        threadId = String(field(thread, "id") || "");
        const raw = await app.generateSkillDraft(threadId, skillDraftPrompt(input), SKILL_DRAFT_OUTPUT_SCHEMA, input.model, input.effort);
        let value: unknown;
        try {
            value = JSON.parse(raw);
        } catch {
            throw new Error("Codex 返回的 Skill 草稿不是有效 JSON");
        }
        const parsed = skillDraftSchema.safeParse(value);
        if (!parsed.success) throw new Error("Codex 返回的 Skill 草稿格式不正确");
        assertDraftHasNoSensitiveValues(parsed.data, input.source === "canvas" ? canvasPrivateValues(input.snapshot) : []);
        return parsed.data;
    } finally {
        if (threadId) await app.closeSkillDraftThread(threadId).catch((error) => logger.warn("Failed to release Skill draft thread", { threadId, error }));
    }
}

async function generateInteriorPromptNow(emit: AgentEmit, cwd: string, input: InteriorPromptInput) {
    const app = await getCodexApp(emit);
    let threadId = "";
    let files: string[] = [];
    try {
        const thread = await app.startStructuredOutputThread(cwd, INTERIOR_PROMPT_INSTRUCTIONS);
        threadId = String(field(thread, "id") || "");
        files = await writeAttachmentFiles(input.attachments || []);
        const raw = await app.generateStructuredOutput(threadId, interiorPromptRequest(input), files, INTERIOR_PROMPT_OUTPUT_SCHEMA, input.model, input.effort || "high", "Codex 没有返回室内设计提示词");
        return interiorPromptSchema.parse(JSON.parse(raw));
    } finally {
        if (threadId) await app.closeSkillDraftThread(threadId).catch((error) => logger.warn("Failed to release interior prompt thread", { threadId, error }));
        await Promise.all(files.map((file) => fs.unlink(file).catch(() => undefined)));
    }
}

async function generateFrameFlowPromptNow(emit: AgentEmit, cwd: string, input: FrameFlowPromptInput): Promise<PromptPlan> {
    const app = await getCodexApp(emit);
    let threadId = "";
    try {
        const thread = await app.startStructuredOutputThread(cwd, FRAMEFLOW_PROMPT_INSTRUCTIONS);
        threadId = String(field(thread, "id") || "");
        const raw = await app.generateStructuredOutput(
            threadId,
            frameFlowPromptRequest(input),
            [],
            FRAMEFLOW_PROMPT_OUTPUT_SCHEMA,
            input.model,
            input.effort || "high",
            "Codex 没有返回 FrameFlow Prompt Version",
        );
        let value: unknown;
        try {
            value = JSON.parse(raw);
        } catch {
            throw new Error("Codex 返回的 FrameFlow Prompt 不是有效 JSON");
        }
        const parsed = promptPlanSchema.safeParse(value);
        if (!parsed.success) throw new Error("Codex 返回的 FrameFlow Prompt 格式不正确");
        return parsed.data;
    } finally {
        if (threadId) await app.closeSkillDraftThread(threadId).catch((error) => logger.warn("Failed to release FrameFlow prompt thread", { threadId, error }));
    }
}

async function generateFrameFlowPromptTranslationNow(emit: AgentEmit, cwd: string, input: FrameFlowPromptTranslationInput): Promise<PromptTranslation> {
    const app = await getCodexApp(emit);
    let threadId = "";
    try {
        const thread = await app.startStructuredOutputThread(cwd, FRAMEFLOW_TRANSLATION_INSTRUCTIONS);
        threadId = String(field(thread, "id") || "");
        const raw = await app.generateStructuredOutput(
            threadId,
            frameFlowTranslationRequest(input),
            [],
            FRAMEFLOW_TRANSLATION_OUTPUT_SCHEMA,
            input.model,
            input.effort || "high",
            "Codex 没有返回 FrameFlow 中文翻译",
        );
        let value: unknown;
        try {
            value = JSON.parse(raw);
        } catch {
            throw new Error("Codex 返回的 FrameFlow 中文翻译不是有效 JSON");
        }
        const parsed = promptTranslationSchema.safeParse(value);
        if (!parsed.success) throw new Error("Codex 返回的 FrameFlow 中文翻译格式不正确");
        return parsed.data;
    } finally {
        if (threadId) await app.closeSkillDraftThread(threadId).catch((error) => logger.warn("Failed to release FrameFlow translation thread", { threadId, error }));
    }
}

async function reviewFrameFlowImagesNow(emit: AgentEmit, cwd: string, input: FrameFlowImageReviewInput) {
    const app = await getCodexApp(emit);
    let threadId = "";
    try {
        const thread = await app.startStructuredOutputThread(cwd, FRAMEFLOW_REVIEW_INSTRUCTIONS);
        threadId = String(field(thread, "id") || "");
        const raw = await app.generateStructuredOutput(
            threadId,
            frameFlowReviewRequest(input),
            input.images.map((image) => image.filePath),
            FRAMEFLOW_REVIEW_OUTPUT_SCHEMA,
            input.model,
            input.effort || "high",
            "Codex 没有返回 FrameFlow 机器审图结果",
        );
        const parsed = z.object({ reviews: z.array(machineReviewResultSchema).min(1).max(8) }).strict().parse(JSON.parse(raw));
        const expected = input.images.map((image) => image.imageId);
        const actual = parsed.reviews.map((review) => review.imageId);
        if (new Set(actual).size !== actual.length || expected.some((imageId) => !actual.includes(imageId)) || actual.some((imageId) => !expected.includes(imageId))) {
            throw new Error("Codex 机器审图结果没有逐张对应本轮图片");
        }
        return parsed.reviews;
    } finally {
        if (threadId) await app.closeSkillDraftThread(threadId).catch((error) => logger.warn("Failed to release FrameFlow review thread", { threadId, error }));
    }
}

async function summarizeFrameFlowTrajectoryNow(emit: AgentEmit, cwd: string, input: FrameFlowTrajectorySummaryInput): Promise<AutoRunTrajectorySummaryDraft> {
    const app = await getCodexApp(emit);
    let threadId = "";
    try {
        const thread = await app.startStructuredOutputThread(cwd, FRAMEFLOW_TRAJECTORY_SUMMARY_INSTRUCTIONS);
        threadId = String(field(thread, "id") || "");
        const raw = await app.generateStructuredOutput(
            threadId,
            frameFlowTrajectorySummaryRequest(input),
            [],
            FRAMEFLOW_TRAJECTORY_SUMMARY_OUTPUT_SCHEMA,
            input.model,
            input.effort || "high",
            "Codex 没有返回 FrameFlow 跨轮总结",
        );
        return autoRunTrajectorySummaryDraftSchema.parse(JSON.parse(raw));
    } finally {
        if (threadId) await app.closeSkillDraftThread(threadId).catch((error) => logger.warn("Failed to release FrameFlow trajectory summary thread", { threadId, error }));
    }
}

async function generateFrameFlowImagesNow(emit: AgentEmit, cwd: string, input: FrameFlowImageInput) {
    input.signal.throwIfAborted();
    const app = await getCodexApp(emit);
    let threadId = "";
    let abortTurn: (() => void) | undefined;
    try {
        const thread = await app.startImageGenerationThread(cwd, FRAMEFLOW_IMAGE_INSTRUCTIONS);
        threadId = String(field(thread, "id") || "");
        input.signal.throwIfAborted();
        abortTurn = () => { void app.interruptCurrentTurn(threadId); };
        input.signal.addEventListener("abort", abortTurn, { once: true });
        return await app.generateImages(
            threadId,
            frameFlowImageRequest(input),
            input.referenceFiles,
            input.model,
            input.effort || "high",
            "Codex ImageGen 没有返回 FrameFlow 图片",
        );
    } finally {
        if (abortTurn) input.signal.removeEventListener("abort", abortTurn);
        if (threadId) await app.closeSkillDraftThread(threadId).catch((error) => logger.warn("Failed to release FrameFlow ImageGen thread", { threadId, error }));
    }
}

async function generateInteriorImagesNow(emit: AgentEmit, cwd: string, input: InteriorImageInput) {
    const app = await getCodexApp(emit);
    let threadId = "";
    let files: string[] = [];
    try {
        const thread = await app.startImageGenerationThread(cwd, INTERIOR_IMAGE_INSTRUCTIONS);
        threadId = String(field(thread, "id") || "");
        files = await writeAttachmentFiles(input.attachments || []);
        if (!files.length) throw new Error("Codex ImageGen 需要一张空间参考图");
        return await app.generateImages(threadId, interiorImageRequest(input), files.slice(0, 1), input.model, input.effort || "high");
    } finally {
        if (threadId) await app.closeSkillDraftThread(threadId).catch((error) => logger.warn("Failed to release interior ImageGen thread", { threadId, error }));
        await Promise.all(files.map((file) => fs.unlink(file).catch(() => undefined)));
    }
}

async function generateCanvasImagesNow(emit: AgentEmit, cwd: string, input: CanvasImageInput) {
    const app = await getCodexApp(emit);
    let threadId = "";
    let files: string[] = [];
    try {
        const thread = await app.startImageGenerationThread(cwd, CANVAS_IMAGE_INSTRUCTIONS);
        threadId = String(field(thread, "id") || "");
        files = await writeAttachmentFiles(input.attachments || []);
        return await app.generateImages(threadId, canvasImageRequest(input), files.slice(0, 8), input.model, input.effort || "high");
    } finally {
        if (threadId) await app.closeSkillDraftThread(threadId).catch((error) => logger.warn("Failed to release canvas ImageGen thread", { threadId, error }));
        await Promise.all(files.map((file) => fs.unlink(file).catch(() => undefined)));
    }
}

function skillDraftPrompt(input: CodexSkillDraftInput) {
    const source = input.source === "conversation"
        ? "从这个临时分支继承的完整对话中，识别已经实际完成且值得复用的稳定流程。不要总结本条提炼请求，也不要保留一次性的结论、错误排查过程或工具日志。"
        : `从下面经过清理的画布快照中，识别节点、连线和生成步骤所表达的可复用流程。不要把画布节点 ID 写进执行说明。\n\n画布快照：\n${JSON.stringify(canvasSkillSource(input.snapshot))}`;
    return [
        "请生成一个可编辑的 Codex Skill 草稿。",
        source,
        "要求：",
        "- name 使用不超过 64 个字符的小写字母、数字和连字符，优先使用简短的动词短语。",
        "- description 同时说明能力和触发场景；所有何时使用的信息都写在这里。",
        "- instructions 只写另一个 Codex 真正需要的、可复用的命令式步骤、约束和输出要求，不写 YAML frontmatter。",
        "- shortDescription 写 25–64 个字符的人类可读短说明；没有合适内容时返回空字符串。",
        "- defaultPrompt 必须包含与 name 完全一致的 $skill-name 调用标记；没有合适内容时返回空字符串。",
        "- displayName 使用简洁的人类可读名称。",
        "- 不得输出 Token、API Key、密码、凭证、本地路径、媒体 URL、敏感 URL、临时错误、调试日志或一次性结果。",
        "只按 outputSchema 返回对象。",
    ].join("\n");
}

function mentionsSkill(prompt: string, name: string) {
    return new RegExp(`\\$${name}(?![A-Za-z0-9_-]|:[A-Za-z0-9_-])`).test(prompt);
}

/** 读取线程历史，并显式标记 Codex 是否已经物化 turns。 */
async function loadCodexHistory(emit: AgentEmit, threadId: string, cwd?: string) {
    try {
        return { thread: await loadCodexThread(emit, threadId, cwd, true), historyReady: true };
    } catch (error) {
        if (/not materialized yet.*includeTurns/i.test(errorMessage(error))) return { thread: await loadCodexThread(emit, threadId, cwd, false), historyReady: false };
        if (!isRecoverableThreadError(error)) throw error;
        const app = await getCodexApp(emit);
        const thread = await resumeLoadedThread(app, threadId, cwd, "request", false);
        try {
            return { thread: await loadCodexThread(emit, threadId, cwd, true), historyReady: true };
        } catch (historyError) {
            if (/not materialized yet.*includeTurns/i.test(errorMessage(historyError))) return { thread, historyReady: false };
            throw historyError;
        }
    }
}

/** 恢复线程并统一校验工作空间与进程内活动线程。 */
async function resumeLoadedThread(app: CodexAppClient, threadId: string, cwd?: string, permissionMode: AgentPermissionMode = "request", updateLoaded = true, preheat = false) {
    const thread = await app.resumeThread(threadId, cwd, permissionMode, preheat);
    assertThreadWorkspace(thread, cwd);
    if (updateLoaded) loadedThreadId = String(field(thread, "id") || threadId);
    return thread;
}

/** 获取已启动的 Codex app-server 客户端。 */
async function getCodexApp(emit: AgentEmit) {
    if (codexApp) return codexApp;
    codexAppStart ||= CodexAppClient.start(emit, () => {
        codexApp = null;
        loadedThreadId = "";
    });
    try {
        codexApp = await codexAppStart;
        return codexApp;
    } finally {
        codexAppStart = null;
    }
}

/** 校验线程是否属于指定工作空间。 */
function assertThreadWorkspace(thread: unknown, cwd?: string) {
    if (!cwd || threadInWorkspace(thread, cwd)) return;
    throw new Error("该 Codex 会话不属于当前画布工作空间");
}

/** 判断线程工作目录是否与当前工作空间一致。 */
function threadInWorkspace(thread: unknown, cwd: string) {
    const threadCwd = String(field(thread, "cwd") || "");
    return Boolean(threadCwd && samePath(threadCwd, cwd));
}

/** 比较跨平台绝对路径；Windows 路径不区分大小写。 */
function samePath(left: string, right: string) {
    const normalize = (value: string) => process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value);
    return normalize(left) === normalize(right);
}

/** 将图片附件写入临时文件供 Codex 读取。 */
async function writeAttachmentFiles(attachments: AgentAttachment[]) {
    return await Promise.all(attachments.filter((item) => item.dataUrl?.startsWith("data:image/")).map(writeAttachmentFile));
}

/** 将单个 Data URL 图片附件写入临时文件。 */
async function writeAttachmentFile(item: AgentAttachment) {
    const [, meta = "", data = ""] = item.dataUrl?.match(/^data:([^;]+);base64,(.+)$/) || [];
    if (!data) throw new Error(`图片附件无效：${item.name || "未命名图片"}`);
    const file = path.join(os.tmpdir(), `infinite-canvas-${Date.now()}-${Math.random().toString(16).slice(2)}.${imageExt(meta || item.type)}`);
    await fs.writeFile(file, Buffer.from(data, "base64"));
    return file;
}

/** 根据图片 MIME 类型返回临时文件扩展名。 */
function imageExt(type = "") {
    if (type.includes("png")) return "png";
    if (type.includes("webp")) return "webp";
    return "jpg";
}
