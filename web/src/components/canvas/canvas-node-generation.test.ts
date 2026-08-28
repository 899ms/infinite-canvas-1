import { describe, expect, it } from "vitest";

import { buildGenerationConfig } from "@/lib/canvas/canvas-generation-helpers";
import { defaultConfig } from "@/stores/use-config-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "@/types/canvas";
import { buildNodeGenerationContext } from "./canvas-node-generation";

const textNode: CanvasNodeData = {
    id: "upstream-text",
    title: "上游文本",
    type: CanvasNodeType.Text,
    position: { x: 0, y: 0 },
    width: 320,
    height: 240,
    metadata: { content: "保留主体的暖色逆光和胶片颗粒" },
};

const configNode: CanvasNodeData = {
    id: "generation-config",
    title: "生成配置",
    type: CanvasNodeType.Config,
    position: { x: 400, y: 0 },
    width: 320,
    height: 240,
    metadata: { composerContent: "请以 @[node:upstream-text] 为画面参考，生成一张人物特写。" },
};

const connection: CanvasConnection = {
    id: "text-to-config",
    fromNodeId: textNode.id,
    toNodeId: configNode.id,
};

describe("画布节点生成配置", () => {
    it("连续生成和失败重试都从当前上游文本重建提示词", () => {
        const prompt = configNode.metadata!.composerContent!;
        const firstAttempt = buildNodeGenerationContext(configNode.id, [textNode, configNode], [connection], prompt);
        const retryAttempt = buildNodeGenerationContext(configNode.id, [textNode, configNode], [connection], prompt);

        expect(firstAttempt).toEqual(retryAttempt);
        expect(firstAttempt.prompt).toBe("请以 【文本1】 为画面参考，生成一张人物特写。\n\n【文本1】\n保留主体的暖色逆光和胶片颗粒");
        expect(firstAttempt.prompt.match(/保留主体的暖色逆光和胶片颗粒/g)).toHaveLength(1);
    });

    it("切换生成类型时使用当前类型的模型", () => {
        const config = {
            ...defaultConfig,
            imageModel: "default::gpt-image-2",
            videoModel: "default::grok-imagine-video",
            textModel: "default::gpt-5.5",
            audioModel: "default::gpt-4o-mini-tts",
        };

        expect(buildGenerationConfig(config, configNode, "image").model).toBe("default::gpt-image-2");
        expect(buildGenerationConfig(config, configNode, "video").model).toBe("default::grok-imagine-video");
        expect(buildGenerationConfig(config, configNode, "text").model).toBe("default::gpt-5.5");
        expect(buildGenerationConfig(config, configNode, "audio").model).toBe("default::gpt-4o-mini-tts");
    });
});
