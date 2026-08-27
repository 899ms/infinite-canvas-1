import { nanoid } from "nanoid";

import type { InteriorImageGenerationContext } from "@/lib/canvas/interior-canvas-workflow";
import { requestInteriorImages } from "@/services/api/interior-design";
import { imageToDataUrl, uploadImage } from "@/services/image-storage";
import type { AgentReasoningEffort } from "@/stores/use-agent-store";
import type { CanvasNodeImage } from "@/types/canvas";

type ReadyInteriorImageContext = Extract<InteriorImageGenerationContext, { ok: true }>;

export async function generateInteriorCanvasCandidates(input: { endpoint: string; token: string; context: ReadyInteriorImageContext; model?: string; effort: AgentReasoningEffort; signal?: AbortSignal }): Promise<CanvasNodeImage[]> {
    const { workflow, prompt, referenceNode } = input.context;
    const reference = {
        id: referenceNode.id,
        name: `${referenceNode.title || referenceNode.id}.png`,
        type: referenceNode.metadata.mimeType || "image/png",
        dataUrl: referenceNode.metadata.content,
        storageKey: referenceNode.metadata.storageKey,
    };
    const blobs = await requestInteriorImages(
        input.endpoint,
        input.token,
        {
            stage: workflow.role === "white-result" ? "white-model" : "design",
            roomType: workflow.roomType,
            style: workflow.style,
            requirements: workflow.requirements,
            prompt,
            imageDataUrl: await imageToDataUrl(reference),
            count: 3,
            model: input.model,
            effort: input.effort,
        },
        { signal: input.signal },
    );
    const uploaded = await Promise.all(blobs.map((blob) => uploadImage(blob)));
    if (!uploaded.length) throw new Error("Codex ImageGen 没有返回可用图片");
    return uploaded.map((item) => ({
        id: nanoid(),
        status: "success",
        content: item.url,
        storageKey: item.storageKey,
        naturalWidth: item.width,
        naturalHeight: item.height,
        bytes: item.bytes,
        mimeType: item.mimeType,
    }));
}
