import { describe, expect, it } from "vitest";

import { settleCancelledGenerationNodes } from "@/lib/canvas/canvas-generation-state";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

const node = (id: string, status: "idle" | "success" | "loading" | "error"): CanvasNodeData => ({
    id,
    type: CanvasNodeType.Image,
    title: id,
    position: { x: 0, y: 0 },
    width: 320,
    height: 240,
    metadata: {
        status,
        errorDetails: "旧错误",
        images: [
            { id: `${id}-loading`, status: "loading", content: "", storageKey: "", naturalWidth: 0, naturalHeight: 0, bytes: 0, mimeType: "" },
            { id: `${id}-success`, status: "success", content: "blob:image", storageKey: "image:success", naturalWidth: 10, naturalHeight: 10, bytes: 1, mimeType: "image/png" },
        ],
    },
});

describe("settleCancelledGenerationNodes", () => {
    it("将被取消的加载节点收束为空闲，并标记仍在加载的图片槽位", () => {
        const result = settleCancelledGenerationNodes([node("affected", "loading")], new Set(["affected"]), "请求已取消");

        expect(result[0].metadata).toMatchObject({ status: "idle", errorDetails: undefined });
        expect(result[0].metadata?.images).toMatchObject([
            { id: "affected-loading", status: "error", errorDetails: "请求已取消" },
            { id: "affected-success", status: "success", content: "blob:image" },
        ]);
    });

    it("不改变无关或非加载节点", () => {
        const unaffected = node("unaffected", "loading");
        const settled = node("settled", "success");
        const result = settleCancelledGenerationNodes([unaffected, settled], new Set(["settled"]), "请求已取消");

        expect(result).toEqual([unaffected, settled]);
        expect(result[0]).toBe(unaffected);
        expect(result[1]).toBe(settled);
    });
});
