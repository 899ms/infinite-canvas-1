import { nanoid } from "nanoid";

import { createCanvasNode, imageMetadata, videoMetadata } from "@/lib/canvas/canvas-node-factory";
import type { UploadedFile } from "@/services/file-storage";
import type { UploadedImage } from "@/services/image-storage";
import type { ReferenceImage } from "@/types/image";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type CanvasNodeImage, type CanvasNodeMetadata, type InteriorWorkflowMetadata, type InteriorWorkflowNodeRole, type ViewportTransform } from "@/types/canvas";

export type InteriorCanvasCandidate = UploadedImage & { id: string };

export type InteriorCanvasWorkflowInput = {
    plan: ReferenceImage;
    regionImage: UploadedImage;
    region: { x: number; y: number; width: number; height: number };
    roomType: string;
    style: string;
    requirements: string;
    videoModel: string;
    videoSize?: string;
    videoSeconds?: string;
    whitePrompt?: { title?: string; text: string; summary?: string; negativePrompt?: string };
    designPrompt?: { title?: string; text: string; summary?: string; negativePrompt?: string };
    walkthroughPrompt?: { title?: string; text: string; summary?: string; negativePrompt?: string };
    whiteCandidates?: InteriorCanvasCandidate[];
    selectedWhiteId?: string;
    designCandidates?: InteriorCanvasCandidate[];
    selectedDesignId?: string;
    video?: UploadedFile | null;
};

export type InteriorCanvasWorkflow = {
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    viewport: ViewportTransform;
};

const codexInstructions = {
    "white-model": "使用 Codex 分析上游平面图选区，生成严格保持门窗、墙体、比例和空间关系的室内白膜提示词。",
    design: "使用 Codex 分析上游白膜主方案，生成保持空间结构不变的室内设计成品图提示词。",
    walkthrough: "使用 Codex 分析上游室内设计成品图，生成空间连续、运镜稳定的漫游视频提示词。",
} as const;

export function usesCodexImageGen(metadata: InteriorWorkflowMetadata | undefined): metadata is InteriorWorkflowMetadata {
    return metadata?.imageProvider === "codex-imagegen" || metadata?.role === "white-result" || metadata?.role === "design-result";
}

export type InteriorImageGenerationContext =
    | { ok: true; workflow: InteriorWorkflowMetadata; prompt: string; referenceNode: CanvasNodeData & { metadata: CanvasNodeMetadata & { content: string } } }
    | { ok: false; reason: "not_interior_image" | "missing_prompt" | "missing_reference" };

export function resolveInteriorImageGenerationContext(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]): InteriorImageGenerationContext {
    const target = nodes.find((node) => node.id === nodeId);
    const workflow = target?.metadata?.interiorWorkflow;
    if (!usesCodexImageGen(workflow)) return { ok: false, reason: "not_interior_image" };

    const upstream = connections
        .filter((connection) => connection.toNodeId === nodeId)
        .map((connection) => nodes.find((node) => node.id === connection.fromNodeId))
        .filter((node): node is CanvasNodeData => Boolean(node));
    const prompt = (upstream.find((node) => node.type === CanvasNodeType.Text)?.metadata?.content || "").trim();
    if (!prompt) return { ok: false, reason: "missing_prompt" };

    const referenceNode = upstream.find((node): node is CanvasNodeData & { metadata: CanvasNodeMetadata & { content: string } } => node.type === CanvasNodeType.Image && Boolean(node.metadata?.content));
    if (!referenceNode) return { ok: false, reason: "missing_reference" };

    return { ok: true, workflow, prompt, referenceNode };
}

export function buildInteriorCanvasWorkflow(input: InteriorCanvasWorkflowInput): InteriorCanvasWorkflow {
    const workflowId = nanoid();
    const common = { workflowId, roomType: input.roomType, style: input.style, requirements: input.requirements };
    const nodes: CanvasNodeData[] = [];

    const plan = workflowNode(CanvasNodeType.Image, 220, 430, "01 原始平面图", {
        content: input.plan.dataUrl,
        storageKey: input.plan.storageKey,
        mimeType: input.plan.type,
        status: "success",
        interiorWorkflow: interiorMeta(common, "floor-plan", { region: input.region }),
    });
    const region = workflowNode(CanvasNodeType.Image, 650, 430, `02 ${input.roomType}选区`, {
        ...imageMetadata(input.regionImage),
        interiorWorkflow: interiorMeta(common, "selected-region", { region: input.region }),
    });
    const whitePrompt = promptNode(1080, 210, "03 Codex · 白膜提示词", "white-prompt", "white-model", input.whitePrompt, common);
    const whiteResult = imageResultNode(1080, 590, "04 白膜候选 · 选择主图", "white-result", input.whiteCandidates, input.selectedWhiteId, common, {
        prompt: "严格依据上游选区和 Codex 提示词生成三张空间白膜候选。",
    });
    const designPrompt = promptNode(1510, 210, "05 Codex · 设计提示词", "design-prompt", "design", input.designPrompt, common);
    const designResult = imageResultNode(1510, 590, "06 成品候选 · 选择主图", "design-result", input.designCandidates, input.selectedDesignId, common, {
        prompt: "严格保持上游白膜空间结构，依据 Codex 提示词生成三张室内设计成品图。",
    });
    const walkthroughPrompt = promptNode(1940, 210, "07 Codex · 漫游提示词", "walkthrough-prompt", "walkthrough", input.walkthroughPrompt, common);
    const walkthroughVideo = workflowNode(CanvasNodeType.Video, 1940, 590, "08 室内漫游视频", {
        ...(input.video ? videoMetadata(input.video) : { status: "idle" as const }),
        model: input.videoModel,
        size: input.videoSize || "16:9",
        seconds: input.videoSeconds || "10",
        prompt: "依据上游成品图和 Codex 漫游提示词，生成连贯稳定的室内空间漫游视频。",
        interiorWorkflow: interiorMeta(common, "walkthrough-video"),
    });

    nodes.push(plan, region, whitePrompt, whiteResult, designPrompt, designResult, walkthroughPrompt, walkthroughVideo);
    const connections = [
        connection(plan, region),
        connection(region, whitePrompt),
        connection(region, whiteResult),
        connection(whitePrompt, whiteResult),
        connection(whiteResult, designPrompt),
        connection(whiteResult, designResult),
        connection(designPrompt, designResult),
        connection(designResult, walkthroughPrompt),
        connection(designResult, walkthroughVideo),
        connection(walkthroughPrompt, walkthroughVideo),
    ];

    return { nodes, connections, viewport: { x: 80, y: 80, k: 0.72 } };
}

function workflowNode(type: CanvasNodeType, x: number, y: number, title: string, metadata: CanvasNodeMetadata) {
    return { ...createCanvasNode(type, { x, y }, metadata), title };
}

function promptNode(x: number, y: number, title: string, role: InteriorWorkflowNodeRole, stage: "white-model" | "design" | "walkthrough", draft: InteriorCanvasWorkflowInput["whitePrompt"], common: Omit<InteriorWorkflowMetadata, "role">) {
    return workflowNode(CanvasNodeType.Text, x, y, title, {
        content: draft?.text || "",
        prompt: codexInstructions[stage],
        status: draft?.text ? "success" : "idle",
        fontSize: 13,
        interiorWorkflow: interiorMeta(common, role, {
            promptStage: stage,
            promptTitle: draft?.title,
            promptSummary: draft?.summary,
            negativePrompt: draft?.negativePrompt,
        }),
    });
}

function imageResultNode(
    x: number,
    y: number,
    title: string,
    role: InteriorWorkflowNodeRole,
    candidates: InteriorCanvasCandidate[] | undefined,
    selectedId: string | undefined,
    common: Omit<InteriorWorkflowMetadata, "role">,
    generation: Pick<CanvasNodeMetadata, "prompt">,
) {
    const items = candidates || [];
    const primary = items.find((item) => item.id === selectedId) || items[0];
    const images: CanvasNodeImage[] | undefined = items.length
        ? items.map((item) => ({ id: item.id, status: "success", content: item.url, storageKey: item.storageKey, naturalWidth: item.width, naturalHeight: item.height, bytes: item.bytes, mimeType: item.mimeType }))
        : undefined;
    return workflowNode(CanvasNodeType.Image, x, y, title, {
        ...generation,
        count: 3,
        status: primary ? "success" : "idle",
        content: primary?.url || "",
        storageKey: primary?.storageKey,
        naturalWidth: primary?.width,
        naturalHeight: primary?.height,
        bytes: primary?.bytes,
        mimeType: primary?.mimeType,
        images,
        primaryImageId: primary?.id,
        interiorWorkflow: interiorMeta(common, role, { imageProvider: "codex-imagegen" }),
    });
}

function interiorMeta(common: Omit<InteriorWorkflowMetadata, "role">, role: InteriorWorkflowNodeRole, patch: Partial<InteriorWorkflowMetadata> = {}): InteriorWorkflowMetadata {
    return { ...common, role, ...patch };
}

function connection(from: CanvasNodeData, to: CanvasNodeData): CanvasConnection {
    return { id: nanoid(), fromNodeId: from.id, toNodeId: to.id };
}
