import { describe, expect, it } from "vitest";

import { CanvasGenerationRequestRegistry } from "@/lib/canvas/canvas-generation-requests";

describe("CanvasGenerationRequestRegistry", () => {
    it("同一结果节点的新请求会取消并替换旧请求", () => {
        const registry = new CanvasGenerationRequestRegistry();
        const first = registry.start("result", "source");
        const second = registry.start("result", "source");

        expect(first.signal.aborted).toBe(true);
        expect(second.signal.aborted).toBe(false);
        expect(registry.has("result")).toBe(true);
    });

    it("只允许当前控制器完成并移除请求", () => {
        const registry = new CanvasGenerationRequestRegistry();
        const stale = registry.start("result", "source");
        const current = registry.start("result", "source");

        registry.finish("result", stale);
        expect(registry.has("result")).toBe(true);
        registry.finish("result", current);
        expect(registry.has("result")).toBe(false);
    });

    it("按运行节点取消所有关联请求并保留无关请求", () => {
        const registry = new CanvasGenerationRequestRegistry();
        const root = registry.start("root", "source", "run-a");
        const child = registry.start("child", "source", "run-a", root);
        const unrelated = registry.start("other", "other-source", "run-b");

        expect(registry.cancelByRunningId("run-a")).toEqual(["root", "source", "child"]);
        expect(root.signal.aborted).toBe(true);
        expect(child.signal.aborted).toBe(true);
        expect(unrelated.signal.aborted).toBe(false);
        expect(registry.has("root")).toBe(false);
        expect(registry.has("child")).toBe(false);
        expect(registry.has("other")).toBe(true);
    });
});
