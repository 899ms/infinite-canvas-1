import { afterEach, describe, expect, it, vi } from "vitest";

import { buildGenerationConfig } from "@/lib/canvas/canvas-generation-helpers";
import { defaultConfig } from "@/stores/use-config-store";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";
import { runModelPlugin } from "./model-plugin";
import { requestImageQuestion } from "./image";

const textConfig = (reasoningEffort: "auto" | "low" | "medium" | "high" | "xhigh") => ({
    ...defaultConfig,
    model: "default::gpt-5.5",
    textModel: "default::gpt-5.5",
    apiKey: "test-key",
    reasoningEffort,
});

afterEach(() => vi.unstubAllGlobals());

describe("画布文本推理强度", () => {
    it("节点设置优先于全局默认值", () => {
        const node: CanvasNodeData = {
            id: "config-1",
            title: "文本配置",
            type: CanvasNodeType.Config,
            position: { x: 0, y: 0 },
            width: 320,
            height: 240,
            metadata: { reasoningEffort: "xhigh" },
        };

        expect(buildGenerationConfig(textConfig("auto"), node, "text").reasoningEffort).toBe("xhigh");
    });

    it.each([
        ["auto", undefined],
        ["high", { effort: "high" }],
    ] as const)("OpenAI Responses 在 %s 时按预期组装 reasoning", async (reasoningEffort, expectedReasoning) => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, body: null, json: async () => ({ output_text: "完成" }) });
        vi.stubGlobal("fetch", fetchMock);

        await expect(requestImageQuestion(textConfig(reasoningEffort), [{ role: "user", content: "整理画布" }], vi.fn())).resolves.toBe("完成");

        const request = fetchMock.mock.calls[0];
        const body = JSON.parse(String(request?.[1]?.body));
        expect(body.reasoning).toEqual(expectedReasoning);
    });

    it("文本模型自定义脚本可读取 reasoningEffort", async () => {
        await expect(
            runModelPlugin({
                capability: "text",
                script: "return reasoningEffort;",
                config: textConfig("medium"),
            }),
        ).resolves.toBe("medium");
    });
});
