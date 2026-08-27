import type { AutoRunTrajectorySummaryInput, CreativeBrief, FrameFlowPreferenceContext, MachineReview, PromptDisplayLanguage, PromptVersion } from "../frameflow/types.js";
import type { CodexReasoningEffort } from "./codex-protocol.js";

export type FrameFlowPromptInput = { brief: CreativeBrief; strategy: CreativeBrief["strategy"]; preference: FrameFlowPreferenceContext; machineReviews: MachineReview[]; model?: string; effort?: CodexReasoningEffort };
export type FrameFlowPromptTranslationInput = { prompt: PromptVersion; language: PromptDisplayLanguage; model?: string; effort?: CodexReasoningEffort };
export type FrameFlowImageInput = { prompt: PromptVersion; count: number; aspectRatio: string; cropPosition: "top" | "attention"; referenceFiles: string[]; signal: AbortSignal; model?: string; effort?: CodexReasoningEffort };
export type FrameFlowImageReviewInput = { brief: CreativeBrief; prompt: PromptVersion; autoRunId: string; runId: string; iteration: number; images: Array<{ imageId: string; filePath: string }>; model?: string; effort?: CodexReasoningEffort };
export type FrameFlowTrajectorySummaryInput = AutoRunTrajectorySummaryInput & { model?: string; effort?: CodexReasoningEffort };

export function frameFlowPromptRequest(input: FrameFlowPromptInput) {
    return [
        `策略：${input.strategy}`,
        "Creative Brief：",
        JSON.stringify(input.brief, null, 2),
        "Preference DNA（来自不可变人工反馈，仅作为审美证据，不能覆盖 Brief 硬约束）：",
        JSON.stringify(input.preference, null, 2),
        "本自动跑此前的 Machine Review（Codex 自评，仅用于改进当前方向，不能写入或冒充人工 Preference DNA）：",
        JSON.stringify(input.machineReviews, null, 2),
        "完整覆盖 subject、composition、color、lighting、material、layout、mood、rendering、technical、negative 十个字段。",
        "compiledPrompt 必须由这些结构字段完整重建，并执行 constraints.keep、constraints.avoid、aspectRatio 与用途要求。",
        "不得添加 Brief 中不存在的品牌、人物身份、版权角色或未经请求的文字内容。",
        "decision.evidence 必须与 Preference DNA 的 boost 和 avoid 图片一一对应；没有证据时返回空数组。每条说明 adopted、avoided 或 ignored、受影响字段和具体原因。",
        "只按 outputSchema 返回对象。",
    ].join("\n\n");
}

export function frameFlowReviewRequest(input: FrameFlowImageReviewInput) {
    return [
        `自动跑：${input.autoRunId}；第 ${input.iteration} 轮；Run：${input.runId}`,
        "Creative Brief：",
        JSON.stringify(input.brief, null, 2),
        "本轮批准 Prompt：",
        JSON.stringify({ id: input.prompt.id, fields: input.prompt.fields, compiledPrompt: input.prompt.compiledPrompt }, null, 2),
        "附件与 imageId 按相同顺序一一对应：",
        JSON.stringify(input.images.map((image, index) => ({ index: index + 1, imageId: image.imageId })), null, 2),
        "rating：1=严重偏离或明显失败，3=可用但需改进，5=高度符合方向且完成度高。decision：keep=下一轮保留该方向，vary=保留核心但做变体，reject=下一轮主动规避。",
        "comment 使用简体中文，明确说明判断依据和下一轮动作；strengths/issues 使用简短可执行条目。必须逐张返回且不得遗漏、重复或编造 imageId。",
        "只按 outputSchema 返回对象。",
    ].join("\n\n");
}

export function frameFlowTrajectorySummaryRequest(input: FrameFlowTrajectorySummaryInput) {
    return [
        "Creative Brief（硬约束与探索方向）：",
        JSON.stringify(input.brief, null, 2),
        "已完成轮次。prompt.diff 是本轮相对上一版的调整；machineReviews 是 Codex 对该轮图片的机器判断：",
        JSON.stringify(input.rounds.map((round) => ({
            iteration: round.iteration,
            prompt: { revision: round.prompt.revision, reason: round.prompt.reason, diff: round.prompt.diff },
            machineReviews: round.machineReviews.map((review) => ({ rating: review.rating, decision: review.decision, comment: review.comment, strengths: review.strengths, issues: review.issues })),
        })), null, 2),
        "improved 只列出有跨轮证据显示减轻或解决的问题；recurring 列出重复出现或最新轮仍存在的问题，并给出下一轮可执行建议。",
        "bestIteration 必须是上述真实 iteration 之一，综合 Brief 符合度、评分、决策、优点、缺陷和完成度选择；evidenceIterations 也只能引用真实轮次。",
        "只按 outputSchema 返回对象。",
    ].join("\n\n");
}

export function frameFlowTranslationRequest(input: FrameFlowPromptTranslationInput) {
    return [
        `目标语言：${input.language}`,
        "英文结构字段：",
        JSON.stringify(input.prompt.fields, null, 2),
        "英文完整 Prompt：",
        input.prompt.compiledPrompt,
        "只返回逐字段对应的中文 fields 与中文 compiledPrompt；不得改变英文执行 Prompt。",
    ].join("\n\n");
}

export function frameFlowImageRequest(input: FrameFlowImageInput) {
    return [
        `必须调用 Codex 原生 ImageGen，生成 ${input.count} 张互相独立的 PNG 图片。`,
        `硬性输出画幅：${input.aspectRatio}。必须让主体和关键界面位于安全构图区，优先使用与该比例一致的原生输出尺寸；不得拉伸、加边框或留黑。系统会在落库前智能裁切任何偏离画幅的结果。`,
        `已批准 Prompt：\n${input.prompt.compiledPrompt}`,
        `Negative：\n${input.prompt.fields.negative.join(", ") || "none"}`,
        `技术约束：\n${input.prompt.fields.technical.join(", ") || "none"}`,
        input.referenceFiles.length ? `提供了 ${input.referenceFiles.length} 张参考图，必须遵守其构图、主体或血缘约束。` : "本轮没有参考图。",
        `连续调用 ImageGen 直到获得 ${input.count} 张结果；只生成图片，不输出解释。`,
    ].join("\n\n");
}
