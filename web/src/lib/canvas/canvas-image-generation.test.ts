import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    applyCodexCanvasImageSlotFailure,
    applyCodexCanvasImageSlotSuccess,
    finalizeCodexCanvasImageGeneration,
    initializeCodexCanvasImageGenerationNodes,
    prepareCodexCanvasImageReferences,
    requestCodexCanvasImages,
    runCodexCanvasImageSlots,
} from "@/lib/canvas/canvas-image-generation";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

const mocks = vi.hoisted(() => ({
    agent: { url: "http://127.0.0.1:17371/", token: " token ", model: "model", reasoningEffort: "high" },
    imageToDataUrl: vi.fn(),
    requestCanvasImages: vi.fn(),
    uploadImage: vi.fn(),
}));

vi.mock("@/stores/use-agent-store", () => ({ useAgentStore: { getState: () => mocks.agent } }));
vi.mock("@/services/image-storage", () => ({ imageToDataUrl: mocks.imageToDataUrl, uploadImage: mocks.uploadImage }));
vi.mock("@/services/api/canvas-imagegen", () => ({ requestCanvasImages: mocks.requestCanvasImages }));

describe("requestCodexCanvasImages", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.agent.url = "http://127.0.0.1:17371/";
        mocks.agent.token = " token ";
        mocks.imageToDataUrl.mockImplementation(async (reference: { id: string }) => `data:image/png;base64,${reference.id}`);
        mocks.requestCanvasImages.mockResolvedValue([new Blob(["image"], { type: "image/png" })]);
        mocks.uploadImage.mockResolvedValue({ url: "blob:result", storageKey: "image:result", width: 1024, height: 768, bytes: 5, mimeType: "image/png" });
    });

    it("只转换前八张参考图并携带当前 Agent 模型设置", async () => {
        const references = Array.from({ length: 9 }, (_, index) => ({ id: `ref-${index}`, name: `参考图 ${index}.png`, type: "image/png", dataUrl: `blob:${index}` }));
        const controller = new AbortController();

        await requestCodexCanvasImages("生成图片", references, 3, "4:5", controller.signal);

        expect(mocks.imageToDataUrl).toHaveBeenCalledTimes(8);
        expect(mocks.requestCanvasImages).toHaveBeenCalledWith(
            "http://127.0.0.1:17371",
            "token",
            expect.objectContaining({ prompt: "生成图片", count: 3, aspectRatio: "4:5", model: "model", effort: "high", references: expect.arrayContaining([expect.objectContaining({ id: "ref-0", dataUrl: "data:image/png;base64,ref-0" })]) }),
            { signal: controller.signal },
        );
    });

    it("没有连接 Token 时不发起 ImageGen 请求", async () => {
        mocks.agent.token = " ";

        await expect(requestCodexCanvasImages("生成图片", [], 1, "1:1")).rejects.toThrow("请先连接 Canvas Agent");
        expect(mocks.requestCanvasImages).not.toHaveBeenCalled();
    });

    it("预检只转换实际会发送的前八张参考图", async () => {
        const references = Array.from({ length: 9 }, (_, index) => ({ id: `ref-${index}`, name: `参考图 ${index}.png`, type: "image/png", dataUrl: `blob:${index}` }));
        mocks.imageToDataUrl.mockImplementation(async (reference: { id: string }) => (reference.id === "ref-8" ? "" : `data:image/png;base64,${reference.id}`));

        const prepared = await prepareCodexCanvasImageReferences(references);

        expect(prepared).toHaveLength(8);
        expect(mocks.imageToDataUrl).toHaveBeenCalledTimes(8);
        expect(prepared[0]).toMatchObject({ id: "ref-0", dataUrl: "data:image/png;base64,ref-0", storageKey: undefined });
    });

    it("前八张中存在失效参考图时在创建结果节点前失败", async () => {
        mocks.imageToDataUrl.mockResolvedValueOnce("");

        await expect(prepareCodexCanvasImageReferences([{ id: "ref-invalid", name: "失效.png", type: "image/png", dataUrl: "blob:invalid" }])).rejects.toThrow("参考图片不可用，请先替换或重新上传该图片");
    });

    it("并发执行图片 slot 并汇总部分失败", async () => {
        mocks.requestCanvasImages.mockResolvedValueOnce([new Blob(["success"])]).mockRejectedValueOnce(new Error("第二张失败"));
        const onSuccess = vi.fn();
        const onFailure = vi.fn();

        const result = await runCodexCanvasImageSlots({ imageIds: ["image-a", "image-b"], prompt: "生成图片", references: [], aspectRatio: "1:1", fallbackError: "生成失败", onSuccess, onFailure });

        expect(result).toEqual({ hasSuccess: true, hasFailure: true, firstError: "第二张失败" });
        expect(onSuccess).toHaveBeenCalledWith("image-a", expect.objectContaining({ storageKey: "image:result" }));
        expect(onFailure).toHaveBeenCalledWith("image-b", "第二张失败");
    });

    it("同一批多图只准备一次参考图与 Agent 请求上下文", async () => {
        const reference = { id: "ref-1", name: "参考图.png", type: "image/png", dataUrl: "blob:reference" };

        const result = await runCodexCanvasImageSlots({ imageIds: ["image-a", "image-b"], prompt: "生成图片", references: [reference], aspectRatio: "1:1", fallbackError: "生成失败", onSuccess: vi.fn(), onFailure: vi.fn() });

        expect(result).toEqual({ hasSuccess: true, hasFailure: false, firstError: "" });
        expect(mocks.imageToDataUrl).toHaveBeenCalledTimes(1);
        expect(mocks.requestCanvasImages).toHaveBeenCalledTimes(2);
        expect(mocks.requestCanvasImages).toHaveBeenNthCalledWith(1, "http://127.0.0.1:17371", "token", expect.objectContaining({ references: [expect.objectContaining({ id: "ref-1", dataUrl: "data:image/png;base64,ref-1" })] }), expect.any(Object));
    });

    it("取消的 slot 不计入失败", async () => {
        const canceled = new Error("已取消");
        canceled.name = "AbortError";
        mocks.requestCanvasImages.mockRejectedValue(canceled);
        const onFailure = vi.fn();

        const result = await runCodexCanvasImageSlots({ imageIds: ["image-a"], prompt: "生成图片", references: [], fallbackError: "生成失败", onSuccess: vi.fn(), onFailure });

        expect(result).toEqual({ hasSuccess: false, hasFailure: false, firstError: "" });
        expect(onFailure).not.toHaveBeenCalled();
    });
});

describe("Codex 画布图片节点状态归并", () => {
    const sourceNode: CanvasNodeData = { id: "source", type: CanvasNodeType.Config, title: "配置", position: { x: -400, y: 0 }, width: 320, height: 320, metadata: { status: "loading" } };
    const resultNode: CanvasNodeData = {
        id: "result",
        type: CanvasNodeType.Image,
        title: "结果",
        position: { x: 0, y: 0 },
        width: 320,
        height: 320,
        metadata: {
            status: "loading",
            images: [
                { id: "image-a", status: "loading", content: "", storageKey: "", naturalWidth: 0, naturalHeight: 0, bytes: 0, mimeType: "" },
                { id: "image-b", status: "loading", content: "", storageKey: "", naturalWidth: 0, naturalHeight: 0, bytes: 0, mimeType: "" },
            ],
        },
    };
    const uploaded = { url: "blob:result", storageKey: "image:result", width: 1024, height: 768, bytes: 5, mimeType: "image/png" };

    it("首张成功时原子更新结果图、主图尺寸和配置节点状态", () => {
        const nodes = applyCodexCanvasImageSlotSuccess([sourceNode, resultNode], {
            sourceNodeId: "source",
            rootNodeId: "result",
            isConfigNode: true,
            imageId: "image-a",
            uploaded,
            maxWidth: 320,
            maxHeight: 320,
        });

        expect(nodes[0].metadata).toMatchObject({ status: "success", errorDetails: undefined });
        expect(nodes[1]).toMatchObject({ position: { x: 0, y: 40 }, width: 320, height: 240 });
        expect(nodes[1].metadata).toMatchObject({ content: "blob:result", storageKey: "image:result", primaryImageId: "image-a" });
        expect(nodes[1].metadata?.images?.[0]).toMatchObject({ id: "image-a", status: "success", content: "blob:result" });
    });

    it("单张失败只标记对应结果，不污染其他 slot", () => {
        const nodes = applyCodexCanvasImageSlotFailure([sourceNode, resultNode], { rootNodeId: "result", imageId: "image-b", errorDetails: "第二张失败" });

        expect(nodes[1].metadata?.images?.[0].status).toBe("loading");
        expect(nodes[1].metadata?.images?.[1]).toMatchObject({ status: "error", errorDetails: "第二张失败" });
    });

    it("部分成功以成功状态收敛，全部失败保留首个具体错误", () => {
        const partial = finalizeCodexCanvasImageGeneration([sourceNode, resultNode], {
            sourceNodeId: "source",
            rootNodeId: "result",
            isConfigNode: true,
            hasSuccess: true,
            firstError: "第二张失败",
            generationFailedError: "生成失败",
            allFailedError: "全部失败",
        });
        const failed = finalizeCodexCanvasImageGeneration([sourceNode, resultNode], {
            sourceNodeId: "source",
            rootNodeId: "result",
            isConfigNode: true,
            hasSuccess: false,
            firstError: "首张失败",
            generationFailedError: "生成失败",
            allFailedError: "全部失败",
        });

        expect(partial.map((node) => node.metadata?.status)).toEqual(["success", "success"]);
        expect(partial[1].metadata?.errorDetails).toBeUndefined();
        expect(failed[0].metadata).toMatchObject({ status: "error", errorDetails: "生成失败" });
        expect(failed[1].metadata).toMatchObject({ status: "error", errorDetails: "首张失败" });
    });
});

describe("Codex 画布图片结果节点初始化", () => {
    it("复用空图片节点并保留用户调整后的尺寸与位置", () => {
        const emptyImage: CanvasNodeData = {
            id: "source",
            type: CanvasNodeType.Image,
            title: "空图片",
            position: { x: 20, y: 40 },
            width: 500,
            height: 300,
            metadata: { status: "idle", model: "旧模型" },
        };

        const nodes = initializeCodexCanvasImageGenerationNodes([emptyImage], {
            sourceNodeId: "source",
            rootNodeId: "source",
            imageIds: ["image-a", "image-b"],
            effectivePrompt: "玻璃杯静物摄影",
            sourcePrompt: "玻璃杯",
            generationMetadata: { generationType: "generation", model: "新模型", count: 2 },
        });

        expect(nodes).toHaveLength(1);
        expect(nodes[0]).toMatchObject({ id: "source", type: CanvasNodeType.Image, title: "玻璃杯静物摄影", position: { x: 20, y: 40 }, width: 500, height: 300 });
        expect(nodes[0].metadata).toMatchObject({ status: "loading", prompt: "玻璃杯静物摄影", model: "新模型", count: 2, errorDetails: undefined });
        expect(nodes[0].metadata?.images?.map((image) => [image.id, image.status])).toEqual([
            ["image-a", "loading"],
            ["image-b", "loading"],
        ]);
    });

    it("配置节点保持加载状态并在右侧创建独立结果节点", () => {
        const configNode: CanvasNodeData = { id: "source", type: CanvasNodeType.Config, title: "配置", position: { x: 100, y: 50 }, width: 340, height: 240, metadata: { status: "idle" } };

        const nodes = initializeCodexCanvasImageGenerationNodes([configNode], {
            sourceNodeId: "source",
            rootNodeId: "result",
            imageIds: ["image-a"],
            effectivePrompt: "专业摄影打光",
            sourcePrompt: "摄影打光",
            generationMetadata: { generationType: "generation", count: 1 },
        });

        expect(nodes).toHaveLength(2);
        expect(nodes[0]).toMatchObject({ id: "source", type: CanvasNodeType.Config, metadata: { status: "loading", errorDetails: undefined } });
        expect(nodes[1]).toMatchObject({ id: "result", type: CanvasNodeType.Image, title: "专业摄影打光", position: { x: 536, y: 50 }, width: 340, height: 240 });
        expect(nodes[1].metadata).toMatchObject({ prompt: "专业摄影打光", status: "loading", generationType: "generation", count: 1 });
    });
});
