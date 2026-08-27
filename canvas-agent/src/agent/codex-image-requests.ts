import type { CodexReasoningEffort } from "./codex-protocol.js";
import type { AgentAttachment } from "./types.js";

export type InteriorPromptStage = "white-model" | "design" | "walkthrough";
export type InteriorPromptInput = {
    stage: InteriorPromptStage;
    roomType: string;
    style?: string;
    requirements?: string;
    model?: string;
    effort?: CodexReasoningEffort;
    attachments?: AgentAttachment[];
};
export type InteriorImageStage = "white-model" | "design";
export type InteriorImageInput = {
    stage: InteriorImageStage;
    roomType: string;
    style?: string;
    requirements?: string;
    prompt: string;
    count?: number;
    model?: string;
    effort?: CodexReasoningEffort;
    attachments?: AgentAttachment[];
};
export type CanvasImageInput = {
    prompt: string;
    count?: number;
    aspectRatio?: string;
    model?: string;
    effort?: CodexReasoningEffort;
    attachments?: AgentAttachment[];
};

export function interiorPromptRequest(input: InteriorPromptInput) {
    const context = [`空间类型：${input.roomType || "未指定"}`, `设计风格：${input.style || "未指定"}`, `附加要求：${input.requirements || "无"}`].join("\n");
    const stage = input.stage === "white-model"
        ? "根据平面图中选定区域生成该空间的纯白建筑白膜提示词。必须保持墙体、门窗、柱体、开口、层高关系和空间比例；使用白色哑光黏土/泡沫板材质、均匀棚拍光、无家具、无装饰、无人物、无文字。输出适合图生图模型的英文 prompt。"
        : input.stage === "design"
          ? "根据选中的白膜参考图生成室内设计成品效果图提示词。必须保持白膜的空间几何、墙体、门窗、视角和开口位置，只添加设计风格、家具、照明、材质与软装；输出适合图生图模型的英文 prompt。"
          : "根据室内设计成品图生成一次连续、真实、稳定的第一人称室内漫游视频提示词。说明起点、行进路径、镜头高度、镜头朝向、速度、转弯、视差、光线稳定和终点；保持空间结构、家具、材质、色彩和物体一致，不新增或删除物体，不穿墙，不瞬移。输出适合图生视频模型的英文 prompt。";
    return `${stage}\n\n${context}\n\n参考图是当前阶段的唯一空间视觉依据。negativePrompt 列出结构漂移、畸变、闪烁等禁止项；summary 用简体中文概括镜头或设计策略。只按 outputSchema 返回对象。`;
}

export function interiorImageRequest(input: InteriorImageInput) {
    const count = Math.max(1, Math.min(3, Math.floor(input.count || 3)));
    const constraints = input.stage === "white-model"
        ? "生成纯白建筑白膜：保留参考平面图选区的墙体、门窗、柱体、开口、比例和空间关系；白色哑光黏土/泡沫板材质，均匀棚拍光；无家具、无装饰、无人物、无文字。"
        : `生成${input.style || "指定风格"}室内设计成品图：严格保持参考白膜的几何、墙体、门窗、开口与相机视角，只添加家具、照明、材质和软装。`;
    return [
        `必须调用 Codex 原生 ImageGen 功能生成 ${count} 张独立候选图。`,
        "附件是唯一空间参考图，不得用其他图片替代。",
        constraints,
        `空间类型：${input.roomType || "未指定"}`,
        `附加要求：${input.requirements || "无"}`,
        `最终生成提示词：${input.prompt}`,
        `请连续调用 ImageGen 直到获得 ${count} 张结果；不要输出文本说明。`,
    ].join("\n");
}

export function canvasImageRequest(input: CanvasImageInput) {
    const count = Math.max(1, Math.min(8, Math.floor(input.count || 1)));
    return [
        `必须调用 Codex 原生 ImageGen 功能生成 ${count} 张独立图片。`,
        input.aspectRatio ? `目标画幅：${input.aspectRatio}。不得拉伸、加边框或留黑。` : "保持适合内容的自然画幅。",
        input.attachments?.length ? `提供了 ${Math.min(input.attachments.length, 8)} 张参考图，必须遵守其中明确的主体、构图或编辑约束。` : "本轮没有参考图，按文本生图。",
        `用户提示词：\n${input.prompt}`,
        `连续调用 ImageGen 直到获得 ${count} 张结果；只生成图片，不输出解释。`,
    ].join("\n\n");
}
