import { describe, expect, it } from "vitest";

import { formatAgentActivity, formatAgentEventLog } from "./agent-event-formatters";

describe("dynamic_tool_call 事件", () => {
    it("使用具体工具名称显示实时卡片、失败原因和日志", () => {
        const started = { type: "item.started", item: { id: "tool-1", type: "dynamic_tool_call", tool: "image_gen" } } as const;
        const failed = { type: "item.completed", item: { id: "tool-1", type: "dynamic_tool_call", tool: "image_gen", status: "failed", error: { message: "图片服务不可用" } } } as const;

        expect(formatAgentActivity(started)).toMatchObject({ title: "调用工具：image_gen", text: "执行调用工具：image_gen中…", detail: { kind: "tool", status: "inProgress" } });
        expect(formatAgentActivity(failed)).toMatchObject({ title: "调用工具：image_gen", text: "图片服务不可用", detail: { kind: "tool", status: "failed", output: "图片服务不可用" } });
        expect(formatAgentEventLog(started)).toEqual({ title: "调用工具", text: "调用工具：image_gen" });
        expect(formatAgentEventLog(failed)).toEqual({ title: "工具失败", text: "调用工具：image_gen · 图片服务不可用" });
    });
});
