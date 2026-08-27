import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateInteriorCanvasCandidates } from "@/lib/canvas/interior-canvas-generation";
import type { InteriorImageGenerationContext } from "@/lib/canvas/interior-canvas-workflow";
import { CanvasNodeType } from "@/types/canvas";

const mocks = vi.hoisted(() => ({
    imageToDataUrl: vi.fn(),
    requestInteriorImages: vi.fn(),
    uploadImage: vi.fn(),
}));

vi.mock("@/services/api/interior-design", () => ({ requestInteriorImages: mocks.requestInteriorImages }));
vi.mock("@/services/image-storage", () => ({ imageToDataUrl: mocks.imageToDataUrl, uploadImage: mocks.uploadImage }));

const context: Extract<InteriorImageGenerationContext, { ok: true }> = {
    ok: true,
    workflow: { role: "design-result", workflowId: "workflow", roomType: "客厅", style: "现代极简", requirements: "保留落地窗" },
    prompt: "专业摄影打光",
    referenceNode: {
        id: "reference",
        type: CanvasNodeType.Image,
        title: "白膜主图",
        position: { x: 0, y: 0 },
        width: 320,
        height: 240,
        metadata: { content: "blob:reference", storageKey: "image:reference", mimeType: "image/webp" },
    },
};

describe("generateInteriorCanvasCandidates", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.imageToDataUrl.mockResolvedValue("data:image/png;base64,reference");
        mocks.requestInteriorImages.mockResolvedValue([new Blob(["image"], { type: "image/png" })]);
        mocks.uploadImage.mockResolvedValue({ url: "blob:result", storageKey: "image:result", width: 1024, height: 768, bytes: 5, mimeType: "image/png" });
    });

    it("按室内阶段请求三张候选并映射为画布图片", async () => {
        const images = await generateInteriorCanvasCandidates({ endpoint: "http://127.0.0.1:17371", token: "token", context, model: "model", effort: "high" });

        expect(mocks.imageToDataUrl).toHaveBeenCalledWith(expect.objectContaining({ id: "reference", dataUrl: "blob:reference", storageKey: "image:reference" }));
        expect(mocks.requestInteriorImages).toHaveBeenCalledWith(
            "http://127.0.0.1:17371",
            "token",
            expect.objectContaining({ stage: "design", count: 3, prompt: "专业摄影打光", imageDataUrl: "data:image/png;base64,reference", model: "model", effort: "high" }),
            { signal: undefined },
        );
        expect(images).toEqual([expect.objectContaining({ status: "success", content: "blob:result", storageKey: "image:result", naturalWidth: 1024, naturalHeight: 768, mimeType: "image/png" })]);
    });

    it("ImageGen 没有返回图片时保留明确错误", async () => {
        mocks.requestInteriorImages.mockResolvedValue([]);

        await expect(generateInteriorCanvasCandidates({ endpoint: "http://127.0.0.1:17371", token: "token", context, effort: "high" })).rejects.toThrow("Codex ImageGen 没有返回可用图片");
        expect(mocks.uploadImage).not.toHaveBeenCalled();
    });
});
