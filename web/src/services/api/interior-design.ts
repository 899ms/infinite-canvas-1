import { AgentApiError, fetchAgentJson } from "@/services/api/canvas-agent";
import type { AgentReasoningEffort } from "@/stores/use-agent-store";

export type InteriorPromptStage = "white-model" | "design" | "walkthrough";
export type InteriorPromptDraft = { title: string; prompt: string; negativePrompt: string; summary: string };
export type InteriorImageStage = "white-model" | "design";

export function requestInteriorPrompt(
    endpoint: string,
    token: string,
    input: {
        stage: InteriorPromptStage;
        roomType: string;
        style?: string;
        requirements?: string;
        imageDataUrl?: string;
        model?: string;
        effort?: AgentReasoningEffort;
    },
    options?: { signal?: AbortSignal },
) {
    const attachments = input.imageDataUrl ? [{ id: `interior-${input.stage}`, name: `${input.stage}.png`, type: "image/png", dataUrl: input.imageDataUrl }] : [];
    return fetchAgentJson<{ ok?: boolean; data: InteriorPromptDraft }>(endpoint, token, "/agent/codex/interior-prompt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, imageDataUrl: undefined, attachments }),
        signal: options?.signal,
    })
        .then((response) => response.data)
        .catch((error: unknown) => {
            if (error instanceof AgentApiError && error.status === 404) {
                throw new Error("当前 Canvas Agent 版本不支持室内设计提示词，请重启本仓库内更新后的 Canvas Agent。");
            }
            throw error;
        });
}

export async function requestInteriorImages(
    endpoint: string,
    token: string,
    input: {
        stage: InteriorImageStage;
        roomType: string;
        style?: string;
        requirements?: string;
        prompt: string;
        imageDataUrl: string;
        count?: number;
        model?: string;
        effort?: AgentReasoningEffort;
    },
    options?: { signal?: AbortSignal },
) {
    const attachments = [{ id: `interior-image-${input.stage}`, name: `${input.stage}.png`, type: "image/png", dataUrl: input.imageDataUrl }];
    try {
        const response = await fetchAgentJson<{ ok?: boolean; data: { images: string[] } }>(endpoint, token, "/agent/codex/interior-images", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...input, imageDataUrl: undefined, attachments, count: Math.max(1, Math.min(3, input.count || 3)) }),
            signal: options?.signal,
        });
        return await Promise.all(
            response.data.images.slice(0, 3).map(async (path) => {
                const result = await fetch(`${endpoint}/agent/local-image?token=${encodeURIComponent(token)}`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ path }),
                    signal: options?.signal,
                });
                if (!result.ok) {
                    const error = (await result.json().catch(() => ({}))) as { error?: string; msg?: string };
                    throw new AgentApiError(result.status, error);
                }
                return await result.blob();
            }),
        );
    } catch (error) {
        if (error instanceof AgentApiError && error.status === 404) {
            throw new Error("当前 Canvas Agent 版本不支持 Codex ImageGen 室内生图，请重启本仓库内更新后的 Canvas Agent。");
        }
        throw error;
    }
}
