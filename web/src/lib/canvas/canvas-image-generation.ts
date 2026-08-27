import { NODE_DEFAULT_SIZE } from "@/constant/canvas";
import { requestCanvasImages } from "@/services/api/canvas-imagegen";
import { isGenerationCanceled } from "@/lib/canvas/canvas-generation-helpers";
import { fitNodeSize } from "@/lib/canvas/canvas-node-size";
import { imageToDataUrl, uploadImage } from "@/services/image-storage";
import { useAgentStore } from "@/stores/use-agent-store";
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeImage, type CanvasNodeMetadata } from "@/types/canvas";
import type { ReferenceImage } from "@/types/image";

type UploadedCanvasImage = Awaited<ReturnType<typeof uploadImage>>;

export function initializeCodexCanvasImageGenerationNodes(
    nodes: CanvasNodeData[],
    input: {
        sourceNodeId: string;
        rootNodeId: string;
        imageIds: string[];
        effectivePrompt: string;
        sourcePrompt: string;
        generationMetadata: CanvasNodeMetadata;
    },
): CanvasNodeData[] {
    const sourceNode = nodes.find((node) => node.id === input.sourceNodeId);
    const isConfigNode = sourceNode?.type === CanvasNodeType.Config;
    const isImageNode = sourceNode?.type === CanvasNodeType.Image;
    const isEmptyImageNode = isImageNode && !sourceNode.metadata?.content;
    const parentConfig = NODE_DEFAULT_SIZE[isConfigNode ? CanvasNodeType.Config : isImageNode ? CanvasNodeType.Image : CanvasNodeType.Text];
    const imageConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
    const parentPosition = sourceNode?.position || { x: 0, y: 0 };
    const rootNode: CanvasNodeData = {
        id: input.rootNodeId,
        type: CanvasNodeType.Image,
        title: input.effectivePrompt.slice(0, 32) || "Generated Image",
        position: {
            x: isEmptyImageNode ? parentPosition.x : parentPosition.x + parentConfig.width + 96,
            y: parentPosition.y + parentConfig.height / 2 - imageConfig.height / 2,
        },
        width: isEmptyImageNode ? sourceNode.width : imageConfig.width,
        height: isEmptyImageNode ? sourceNode.height : imageConfig.height,
        metadata: {
            prompt: input.effectivePrompt,
            status: "loading",
            images: input.imageIds.map((id) => ({ id, status: "loading", content: "", storageKey: "", naturalWidth: 0, naturalHeight: 0, bytes: 0, mimeType: "" })),
            ...input.generationMetadata,
        },
    };
    const updatedNodes = nodes.map((node) => {
        if (node.id !== input.sourceNodeId) return node;
        if (isConfigNode) return { ...node, metadata: { ...node.metadata, status: "loading" as const, errorDetails: undefined } };
        if (isEmptyImageNode) {
            return {
                ...node,
                position: rootNode.position,
                width: rootNode.width,
                height: rootNode.height,
                title: rootNode.title,
                metadata: { ...node.metadata, ...rootNode.metadata, errorDetails: undefined },
            };
        }
        if (isImageNode) return { ...node, metadata: { ...node.metadata, status: "success" as const, errorDetails: undefined } };
        return {
            ...node,
            type: CanvasNodeType.Text,
            title: input.sourcePrompt.slice(0, 32) || "Prompt",
            width: parentConfig.width,
            height: parentConfig.height,
            metadata: { ...node.metadata, content: input.sourcePrompt, prompt: input.sourcePrompt, status: "success" as const, fontSize: 14, errorDetails: undefined },
        };
    });
    return isEmptyImageNode ? updatedNodes : [...updatedNodes, rootNode];
}

export function applyCodexCanvasImageSlotSuccess(
    nodes: CanvasNodeData[],
    input: {
        sourceNodeId: string;
        rootNodeId: string;
        isConfigNode: boolean;
        imageId: string;
        uploaded: UploadedCanvasImage;
        maxWidth: number;
        maxHeight: number;
    },
): CanvasNodeData[] {
    const imageSize = fitNodeSize(input.uploaded.width, input.uploaded.height, input.maxWidth, input.maxHeight);
    const image: CanvasNodeImage = {
        id: input.imageId,
        status: "success",
        content: input.uploaded.url,
        storageKey: input.uploaded.storageKey,
        naturalWidth: input.uploaded.width,
        naturalHeight: input.uploaded.height,
        bytes: input.uploaded.bytes,
        mimeType: input.uploaded.mimeType,
    };

    return nodes.map((node) => {
        let nextNode = node;
        if (node.id === input.rootNodeId) {
            const images = node.metadata?.images?.map((item) => (item.id === input.imageId ? image : item)) || [];
            if (node.metadata?.primaryImageId) {
                nextNode = { ...node, metadata: { ...node.metadata, images } };
            } else {
                const center = { x: node.position.x + node.width / 2, y: node.position.y + node.height / 2 };
                nextNode = {
                    ...node,
                    position: { x: center.x - imageSize.width / 2, y: center.y - imageSize.height / 2 },
                    ...imageSize,
                    metadata: {
                        ...node.metadata,
                        content: image.content,
                        storageKey: image.storageKey,
                        naturalWidth: image.naturalWidth,
                        naturalHeight: image.naturalHeight,
                        bytes: image.bytes,
                        mimeType: image.mimeType,
                        images,
                        primaryImageId: input.imageId,
                    },
                };
            }
        }
        if (input.isConfigNode && node.id === input.sourceNodeId) {
            nextNode = { ...nextNode, metadata: { ...nextNode.metadata, status: "success" as const, errorDetails: undefined } };
        }
        return nextNode;
    });
}

export function applyCodexCanvasImageSlotFailure(nodes: CanvasNodeData[], input: { rootNodeId: string; imageId: string; errorDetails: string }): CanvasNodeData[] {
    return nodes.map((node) =>
        node.id === input.rootNodeId
            ? {
                  ...node,
                  metadata: {
                      ...node.metadata,
                      images: node.metadata?.images?.map((image) => (image.id === input.imageId ? { ...image, status: "error" as const, errorDetails: input.errorDetails } : image)),
                  },
              }
            : node,
    );
}

export function finalizeCodexCanvasImageGeneration(
    nodes: CanvasNodeData[],
    input: {
        sourceNodeId: string;
        rootNodeId: string;
        isConfigNode: boolean;
        hasSuccess: boolean;
        firstError: string;
        generationFailedError: string;
        allFailedError: string;
    },
): CanvasNodeData[] {
    const status = input.hasSuccess ? ("success" as const) : ("error" as const);
    return nodes.map((node) =>
        node.id === input.sourceNodeId && input.isConfigNode
            ? { ...node, metadata: { ...node.metadata, status, errorDetails: input.hasSuccess ? undefined : input.generationFailedError } }
            : node.id === input.rootNodeId
              ? { ...node, metadata: { ...node.metadata, status, errorDetails: input.hasSuccess ? undefined : input.firstError || input.allFailedError } }
              : node,
    );
}

export async function prepareCodexCanvasImageReferences(references: ReferenceImage[]): Promise<ReferenceImage[]> {
    return await Promise.all(
        references.slice(0, 8).map(async (reference) => {
            const dataUrl = await imageToDataUrl(reference);
            if (!dataUrl) throw new Error("参考图片不可用，请先替换或重新上传该图片");
            return { id: reference.id, name: reference.name, type: reference.type, dataUrl, storageKey: undefined };
        }),
    );
}

function resolveCodexCanvasImageRequestContext() {
    const agent = useAgentStore.getState();
    if (!agent.token.trim()) throw new Error("请先连接 Canvas Agent，画布图片统一由 Codex ImageGen 生成");
    return {
        endpoint: agent.url.trim().replace(/\/$/, ""),
        token: agent.token.trim(),
        model: agent.model || undefined,
        effort: agent.reasoningEffort || ("high" as const),
    };
}

async function requestPreparedCodexCanvasImages(context: ReturnType<typeof resolveCodexCanvasImageRequestContext>, prompt: string, references: ReferenceImage[], count: number, aspectRatio: string | undefined, signal?: AbortSignal) {
    return await requestCanvasImages(
        context.endpoint,
        context.token,
        {
            prompt,
            count,
            aspectRatio,
            references,
            model: context.model,
            effort: context.effort,
        },
        { signal },
    );
}

export async function requestCodexCanvasImages(prompt: string, references: ReferenceImage[], count: number, aspectRatio: string | undefined, signal?: AbortSignal) {
    const context = resolveCodexCanvasImageRequestContext();
    const preparedReferences = await prepareCodexCanvasImageReferences(references);
    return await requestPreparedCodexCanvasImages(context, prompt, preparedReferences, count, aspectRatio, signal);
}

export async function runCodexCanvasImageSlots(input: {
    imageIds: string[];
    prompt: string;
    references: ReferenceImage[];
    aspectRatio?: string;
    signal?: AbortSignal;
    fallbackError: string;
    onSuccess: (imageId: string, image: UploadedCanvasImage) => void;
    onFailure: (imageId: string, error: string) => void;
}) {
    let hasSuccess = false;
    let hasFailure = false;
    let firstError = "";
    const context = resolveCodexCanvasImageRequestContext();
    const preparedReferences = await prepareCodexCanvasImageReferences(input.references);
    await Promise.all(
        input.imageIds.map(async (imageId) => {
            try {
                const image = (await requestPreparedCodexCanvasImages(context, input.prompt, preparedReferences, 1, input.aspectRatio, input.signal))[0];
                if (!image) throw new Error("Codex ImageGen 没有返回图片");
                const uploaded = await uploadImage(image);
                input.onSuccess(imageId, uploaded);
                hasSuccess = true;
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const errorDetails = error instanceof Error ? error.message : input.fallbackError;
                if (!firstError) firstError = errorDetails;
                hasFailure = true;
                input.onFailure(imageId, errorDetails);
            }
        }),
    );
    return { hasSuccess, hasFailure, firstError };
}
