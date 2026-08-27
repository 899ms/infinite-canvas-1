import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateInteriorCanvasPrompt } from "@/lib/canvas/interior-canvas-prompt-generation";

const mocks = vi.hoisted(() => ({ imageToDataUrl: vi.fn(), requestInteriorPrompt: vi.fn() }));

vi.mock("@/services/api/interior-design", () => ({ requestInteriorPrompt: mocks.requestInteriorPrompt }));
vi.mock("@/services/image-storage", () => ({ imageToDataUrl: mocks.imageToDataUrl }));

describe("generateInteriorCanvasPrompt", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.imageToDataUrl.mockResolvedValue("data:image/png;base64,reference");
        mocks.requestInteriorPrompt.mockResolvedValue({ title: "白膜提示词", prompt: "保持空间比例", negativePrompt: "扭曲结构", summary: "结构优先" });
    });

    it("携带上游图片和室内约束请求 Codex 并合并负面提示词", async () => {
        const controller = new AbortController();
        const result = await generateInteriorCanvasPrompt({
            endpoint: "http://127.0.0.1:17371",
            token: "token",
            stage: "white-model",
            workflow: { role: "white-prompt", workflowId: "workflow", roomType: "客厅", style: "现代极简", requirements: "保留落地窗" },
            reference: { id: "reference", name: "空间.png", type: "image/png", dataUrl: "blob:reference", storageKey: "image:reference" },
            model: "model",
            effort: "high",
            signal: controller.signal,
        });

        expect(mocks.imageToDataUrl).toHaveBeenCalledWith(expect.objectContaining({ id: "reference", storageKey: "image:reference" }));
        expect(mocks.requestInteriorPrompt).toHaveBeenCalledWith(
            "http://127.0.0.1:17371",
            "token",
            {
                stage: "white-model",
                roomType: "客厅",
                style: "现代极简",
                requirements: "保留落地窗",
                imageDataUrl: "data:image/png;base64,reference",
                model: "model",
                effort: "high",
            },
            { signal: controller.signal },
        );
        expect(result).toEqual({
            draft: { title: "白膜提示词", prompt: "保持空间比例", negativePrompt: "扭曲结构", summary: "结构优先" },
            content: "保持空间比例\n\nAvoid: 扭曲结构",
        });
    });
});
