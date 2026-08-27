import { AgentApiError, fetchAgentJson } from "@/services/api/canvas-agent";
import type { AgentReasoningEffort } from "@/stores/use-agent-store";

export type CanvasImageGenReference = {
    id: string;
    name: string;
    type: string;
    dataUrl: string;
};

export async function requestCanvasImages(
    endpoint: string,
    token: string,
    input: {
        prompt: string;
        count?: number;
        aspectRatio?: string;
        references?: CanvasImageGenReference[];
        model?: string;
        effort?: AgentReasoningEffort;
    },
    options?: { signal?: AbortSignal },
) {
    const attachments = (input.references || []).slice(0, 8).map((reference) => ({
        id: reference.id,
        name: reference.name,
        type: reference.type,
        dataUrl: reference.dataUrl,
    }));
    try {
        const response = await fetchAgentJson<{ ok?: boolean; data: { images: string[] } }>(endpoint, token, "/agent/codex/canvas-images", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...input, references: undefined, attachments, count: Math.max(1, Math.min(8, input.count || 1)) }),
            signal: options?.signal,
        });
        return await Promise.all(
            response.data.images.slice(0, 8).map(async (path) => {
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
            throw new Error("当前 Canvas Agent 版本不支持画布 Codex ImageGen，请重启本仓库内更新后的 Canvas Agent。");
        }
        throw error;
    }
}
