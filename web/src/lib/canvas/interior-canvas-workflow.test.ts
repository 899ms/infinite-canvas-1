import { describe, expect, it } from "vitest";

import { buildInteriorCanvasWorkflow, resolveInteriorImageGenerationContext, usesCodexImageGen } from "@/lib/canvas/interior-canvas-workflow";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "@/types/canvas";

const image = (id: string) => ({ id, url: `blob:${id}`, storageKey: `image:${id}`, width: 1280, height: 720, bytes: 100, mimeType: "image/png" });

describe("buildInteriorCanvasWorkflow", () => {
    it("已有室内结果节点缺少 provider 字段时仍使用本地 Codex ImageGen", () => {
        expect(usesCodexImageGen({ role: "white-result", workflowId: "legacy", roomType: "客厅", style: "现代极简", requirements: "" })).toBe(true);
        expect(usesCodexImageGen({ role: "design-result", workflowId: "legacy", roomType: "客厅", style: "现代极简", requirements: "" })).toBe(true);
    });

    it("旧室内结果节点在进入运行态前验证提示词和参考图", () => {
        const result = canvasNode("result", CanvasNodeType.Image, "", "design-result");
        const prompt = canvasNode("prompt", CanvasNodeType.Text, "专业摄影打光");
        const reference = canvasNode("reference", CanvasNodeType.Image, "blob:reference");
        const connections: CanvasConnection[] = [connect(prompt, result), connect(reference, result)];

        expect(resolveInteriorImageGenerationContext(result.id, [result, reference], [connect(reference, result)])).toEqual({ ok: false, reason: "missing_prompt" });
        expect(resolveInteriorImageGenerationContext(result.id, [result, prompt], [connect(prompt, result)])).toEqual({ ok: false, reason: "missing_reference" });
        expect(resolveInteriorImageGenerationContext(result.id, [result, prompt, reference], connections)).toMatchObject({
            ok: true,
            prompt: "专业摄影打光",
            referenceNode: { id: "reference" },
            workflow: { role: "design-result", workflowId: "legacy" },
        });
    });

    it("创建可逐步执行的室内设计画布节点链", () => {
        const workflow = buildInteriorCanvasWorkflow({
            plan: { id: "plan", name: "plan.png", type: "image/png", dataUrl: "blob:plan", storageKey: "image:plan" },
            regionImage: image("region"),
            region: { x: 0.1, y: 0.2, width: 0.4, height: 0.5 },
            roomType: "客厅",
            style: "现代极简",
            requirements: "保留落地窗",
            videoModel: "video-model",
        });

        expect(workflow.nodes).toHaveLength(8);
        expect(workflow.connections).toHaveLength(10);
        expect(workflow.nodes.map((node) => node.metadata?.interiorWorkflow?.role)).toEqual(["floor-plan", "selected-region", "white-prompt", "white-result", "design-prompt", "design-result", "walkthrough-prompt", "walkthrough-video"]);
        expect(workflow.nodes.find((node) => node.metadata?.interiorWorkflow?.role === "white-result")?.metadata?.count).toBe(3);
        expect(workflow.nodes.find((node) => node.metadata?.interiorWorkflow?.role === "white-result")?.metadata?.interiorWorkflow?.imageProvider).toBe("codex-imagegen");
        expect(workflow.nodes.find((node) => node.metadata?.interiorWorkflow?.role === "design-result")?.metadata?.model).toBeUndefined();
        expect(workflow.nodes.find((node) => node.metadata?.interiorWorkflow?.role === "walkthrough-video")?.metadata?.generationMode).toBeUndefined();
    });

    it("迁移已有候选并保持用户选择的主图", () => {
        const workflow = buildInteriorCanvasWorkflow({
            plan: { id: "plan", name: "plan.png", type: "image/png", dataUrl: "blob:plan", storageKey: "image:plan" },
            regionImage: image("region"),
            region: { x: 0, y: 0, width: 1, height: 1 },
            roomType: "卧室",
            style: "侘寂",
            requirements: "",
            videoModel: "video-model",
            whiteCandidates: [image("white-a"), image("white-b")],
            selectedWhiteId: "white-b",
            whitePrompt: { text: "white prompt", negativePrompt: "bad geometry" },
        });

        const whiteResult = workflow.nodes.find((node) => node.metadata?.interiorWorkflow?.role === "white-result");
        const whitePrompt = workflow.nodes.find((node) => node.metadata?.interiorWorkflow?.role === "white-prompt");
        expect(whiteResult?.metadata?.primaryImageId).toBe("white-b");
        expect(whiteResult?.metadata?.content).toBe("blob:white-b");
        expect(whitePrompt?.metadata?.content).toBe("white prompt");
    });
});

function canvasNode(id: string, type: CanvasNodeType, content: string, role?: "design-result"): CanvasNodeData {
    return {
        id,
        type,
        title: id,
        position: { x: 0, y: 0 },
        width: 320,
        height: 240,
        metadata: {
            content,
            ...(role ? { interiorWorkflow: { role, workflowId: "legacy", roomType: "客厅", style: "现代极简", requirements: "" } } : {}),
        },
    };
}

function connect(from: CanvasNodeData, to: CanvasNodeData): CanvasConnection {
    return { id: `${from.id}-${to.id}`, fromNodeId: from.id, toNodeId: to.id };
}
